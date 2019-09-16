const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { normalizeLayout } = require('./utils')

exports.genTemplateBlock = function (html, file) {
  const attrs = typeof file.data.layout === 'object'
    ? propsToAttrs(file.data.layout.props)
    : ''

  return '' +
    `<template>\n` +
    `  <VueRemarkLayout${attrs}>\n${html}\n</VueRemarkLayout>\n` +
    `</template>\n`
}

exports.genImportBlock = function (statements, file) {
  const layout = normalizeLayout(file.data.layout)

  let code = statements.concat(
    `import VueRemarkLayout from ${JSON.stringify(layout.component)}`
  ).join('\n')

  const ast = parse(code, { sourceType: 'module' })
  const identifiers = {}

  traverse(ast, {
    Identifier (path) {
      identifiers[path.node.name] = true
    }
  })

  code += '\n\n' +
    `import Vue from 'vue'\n\n` +
    `const strats = Vue.config.optionMergeStrategies\n` +
    `const imported = {${Object.keys(identifiers).join(', ')}}\n\n` +
    `export default function (Component) {\n` +
    `  const components = Component.options.components = Component.options.components || {}\n` +
    `  const computed = Component.options.computed = Component.options.computed || {}\n` +
    `  Object.keys(imported).forEach(function (key) {\n` +
    `    if (typeof imported[key] === 'object' && typeof imported[key].render === 'function') {\n` +
    `      components[key] = imported[key]\n` +
    `    } else {\n` +
    `      computed[key] = function () {\n` +
    `        return imported[key]\n` +
    `      }\n` +
    `    }\n` +
    `  })\n` +
    `}`

  return `<vue-remark-import>\n${code}\n</vue-remark-import>`
}

exports.genFrontMatterBlock = function (data) {
  const fields = Object.keys(data)
    .filter(key => key !== 'layout')
    .reduce((acc, key) => {
      acc[key] = data[key]
      return acc
    }, {})

  return '\n' +
   `<vue-remark-frontmatter>\n` +
   `import Vue from 'vue'\n\n` +
   `const strats = Vue.config.optionMergeStrategies\n` +
   `const key = '__vueRemarkFrontMatter'\n` +
   `const data = ${JSON.stringify(fields)}\n\n` +
   `export default function initFrontMatter (Component) {\n` +
   `  if (Component.options[key]) {\n` +
   `    Component.options[key] = data\n` +
   `  }\n\n` +
   `  Vue.util.defineReactive(Component.options, key, data)\n\n` +
   `  Component.options.computed = strats.computed({\n` +
   `    $frontmatter: function () {\n` +
   `      return Component.options[key]\n` +
   `    }\n` +
   `  }, Component.options.computed)\n` +
   `}\n` +
   `</vue-remark-frontmatter>\n`
}

function propsToAttrs (props = {}) {
  const attrs = []

  for (const key in props) {
    const value = props[key]
    const isString = typeof value === 'string'
    const attrName = isString ? key : `:${key}`
    attrs.push(`${attrName}=${JSON.stringify(String(value))}`)
  }

  return attrs.length ? ` ${attrs.join(' ')}` : ''
}
