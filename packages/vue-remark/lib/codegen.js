const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { normalizeLayout } = require('./utils')

exports.genTemplateBlock = function (html, file) {
  const attrs = typeof file.data.layout === 'object'
    ? propsToAttrs(file.data.layout.props)
    : ''

  return '' +
    `<template>\n` +
    `<VueRemarkRoot${attrs}>\n${html}\n</VueRemarkRoot>\n` +
    `</template>`
}

exports.genImportBlock = function (statements, file) {
  const layout = normalizeLayout(file.data.layout)

  let code = statements.concat(
    `import VueRemarkRoot from ${JSON.stringify(layout.component)}`
  ).join('\n')

  const ast = parse(code, { sourceType: 'module' })
  const identifiers = {}

  traverse(ast, {
    ImportDefaultSpecifier (path) {
      identifiers[path.node.local.name] = true
    },
    ImportSpecifier (path) {
      identifiers[path.node.local.name] = true
    }
  })

  code += '\n' +
    `import Vue from 'vue'\n\n` +
    `const strats = Vue.config.optionMergeStrategies\n` +
    `const imported = {${Object.keys(identifiers).join(', ')}}\n\n` +
    `export default function (Component) {\n` +
    `  const components = Component.options.components = Component.options.components || {}\n` +
    `  const computed = Component.options.computed = Component.options.computed || {}\n` +
    `  Object.keys(imported).forEach(function (key) {\n` +
    `    if (typeof imported[key] === 'object' && typeof imported[key].render === 'function') {\n` +
    `      components[key] = imported[key]\n` +
    `    } else if (typeof imported[key] === 'function' && typeof imported[key].options.render === 'function') {\n` +
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

  return '' +
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
   `</vue-remark-frontmatter>`
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
