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

const isNoScriptImage = el => (
  el.tag === 'noscript' &&
  el.children.length === 1 &&
  el.children[0].tag === 'img'
)

const renderNoScriptImage = el => {
  const attrs = (el.attrs || []).reduce((acc, { name, value }) => {
    return acc + ` ${name}=${value}`
  }, '')

  return `<${el.tag} class=${el.staticClass}${attrs}>`
}

const compileTemplate = template =>
  utils.compileTemplate({
    compiler,
    isProduction: isProd,
    preprocessLang: template.lang,
    source: template.content,
    compilerOptions: {
      whitespace: 'condense',
      modules: [
        {
          preTransformNode (el) {
            if (el.tag === 'code') {
              el.attrsList.push({ name: 'v-pre' })
              el.attrsMap['v-pre'] = true
            }
          },
          transformNode (el) {
            if (isNoScriptImage(el)) {
              const html = renderNoScriptImage(el.children[0])
              el.attrsList.push({ name: 'v-html', value: JSON.stringify(html) })
              el.children = []
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
