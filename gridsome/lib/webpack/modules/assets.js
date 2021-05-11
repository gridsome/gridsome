const isUrl = require('is-url')
const camelcase = require('camelcase')
const isRelative = require('is-relative')
const { createSimpleExpression } = require('@vue/compiler-core')
const {isMailtoLink, isTelLink} = require('../../utils')

module.exports = (node, context) => {
  if (node.type === 1 && node.tagType === 1) {
    if (['GLink', 'g-link'].includes(node.tag)) {
      // transformNodeAttr(node, 'to', context)
    }

    if (['GImage', 'g-image'].includes(node.tag)) {
      transformNodeAttr(node, 'src', context)
    }
  }
}

function transformNodeAttr(node, attrName, context) {
  node.props.forEach((attr, index) => {
    if (attr.name !== attrName) return
    if (!attr.value || !isStatic(attr.value)) return

    const value = attr.value.content

    if (
      isUrl(value) ||
      isMailtoLink(value) ||
      isTelLink(value) ||
      !isRelative(value)
    ) {
      return
    }

    const importsArray = Array.from(context.imports)
    const name = `_imports_${importsArray.length}`
    const exp = createSimpleExpression(name, false, attr.loc)
    const query = createOptionsQuery(node.props)
    const path = `!!assets-loader?${query}!${value}`

    context.imports.push({ exp, path })

    node.props[index] = {
      type: 7,
      name: 'bind',
      arg: createSimpleExpression(attr.name, true, attr.loc),
      exp,
      modifiers: [],
      loc: attr.loc
    }
  })
}

function isStatic(value) {
  return value.type === 2
}

function createOptionsQuery(props) {
  return props
    .filter(attr => attr.name !== 'src')
    .filter(attr => attr.value && isStatic(attr.value))
    .map(attr => ({ name: camelcase(attr.name), value: attr.value.content }))
    .map(attr => `${attr.name}=${encodeURIComponent(attr.value)}`)
    .join('&')
}
