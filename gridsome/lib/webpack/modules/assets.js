const isUrl = require('is-url')
const isRelative = require('is-relative')

module.exports = () => ({
  postTransformNode (node) {
    if (node.tag === 'g-link') {
      transformNodeAttr(node, 'to')
    }

    if (node.tag === 'g-image') {
      transformNodeAttr(node, 'src')
    }
  }
})

function transformNodeAttr (node, attrName) {
  if (!Array.isArray(node.attrs)) return

  for (const attr of node.attrs) {
    if (attr.name === attrName) {
      if (isStatic(attr.value)) {
        attr.value = transformAttrValue(node, attr)
        break
      }
    }
  }
}

function transformAttrValue (node, attr) {
  const value = extractValue(attr.value)
  let result = attr.value

  if (!isUrl(value) && isRelative(value)) {
    const query = createOptionsQuery(node.attrs)
    result = `require("!!assets-loader?${query}!${value}")`
  }

  return result
}

function isStatic (value) {
  return /^"[^"]+"$/.test(value)
}

function extractValue (value) {
  return value.substr(1, value.length - 2)
}

function createOptionsQuery (attrs) {
  return attrs
    .filter(attr => attr.name !== 'src')
    .filter(attr => isStatic(attr.value))
    .map(attr => ({ name: attr.name, value: extractValue(attr.value) }))
    .map(attr => `${attr.name}=${encodeURIComponent(attr.value)}`)
    .join('&')
}
