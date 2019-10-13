const path = require('path')
const LRU = require('lru-cache')
const compiler = require('vue-template-compiler')
const utils = require('@vue/component-compiler-utils')

const cache = new LRU({ max: 100 })
const isProd = process.env.NODE_ENV === 'production'

const parse = (value, info) => {
  let template

  try {
    const source = `<template><div>${value}</div></template>`
    const result = utils.parse({ source, compiler })
    template = result.template
  } catch (err) {
    throw new Error(
      `Failed to parse ${info.parentType}.${info.fieldName}. ${err.message}`
    )
  }

  return template
}

const compileTemplate = template =>
  utils.compileTemplate({
    compiler,
    isProduction: isProd,
    preprocessLang: template.lang,
    source: template.content,
    compilerOptions: {
      outputSourceRange: true,
      preserveWhitespace: false,
      modules: [
        {
          preTransformNode (node) {
            if (node.tag === 'code') {
              node.attrsList.push({ name: 'v-pre' })
              node.attrsMap['v-pre'] = true
            }
          },
          transformNode (node) {
            if (node.tag === 'noscript') {
              const outerHTML = template.content.substring(node.start, node.end)
              const [, innerHTML] = outerHTML.match(/<noscript(?:[^>]+)?>(.*)<\/noscript>/)
              node.attrsList.push({ name: 'v-html', value: JSON.stringify(innerHTML) })
              node.children = []
            }
          }
        }
      ]
    }
  })

const createResolver = (ext, config) =>
  async (obj, args, context, info) => {
    const value = await config.resolve(obj, args, context, info)
    const key = info.parentType + info.fieldName + value

    if (typeof value !== 'string') {
      return null
    }

    if (cache.has(key)) {
      return cache.get(key)
    }

    const template = parse(value, info)
    const { errors, code } = compileTemplate(template, info)

    if (errors && errors.length) {
      throw new Error(errors[0])
    }

    cache.set(key, code)

    return code
  }

module.exports = (api, options = {}) => {
  api.transpileDependencies([path.resolve(__dirname, 'runtime')])

  api.createSchema(({ addSchemaFieldExtension }) => {
    addSchemaFieldExtension({
      name: options.name || 'vue',
      args: { cwd: 'String' },
      apply: (ext, config) => ({
        type: 'String',
        resolve: createResolver(ext, config)
      })
    })
  })
}
