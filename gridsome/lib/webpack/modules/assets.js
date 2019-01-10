const isUrl = require('is-url')
const crypto = require('crypto')
const isRelative = require('is-relative')

module.exports = () => ({
  postTransformNode (node) {
    if (node.tag === 'g-link') {
      transformNodeAttr(node, 'to')
    }

    if (node.tag === 'g-image') {
      if (!node.hasOwnProperty('key')) {
        // Enforce a unique key to prevent the g-image component from
        // re-rendering each time the parent is updated. Or else the
        // IntersectionObserver will trigger a lazy load on each update.

        const id = nodePath(node)
        const hash = crypto.createHash('md5')
        const src = getAttrValue(node, 'src') || ''
        const key = hash.update(src + id).digest('hex').substr(0, 7)

        node.key = JSON.stringify(`g-image-${key}`)
      }

      transformNodeAttr(node, 'src')
    }
  }
})

function transformNodeAttr (node, attrName) {
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
  return /^\"[^"]+\"$/.test(value)
}

function extractValue (value) {
  return value.substr(1, value.length - 2)
}

function getAttrValue (node, attrName) {
  return node.attrs
    .filter(({ name }) => name === attrName)
    .map(({ value }) => isStatic(value) ? extractValue(value) : value)
    .pop()
}

function createOptionsQuery (attrs) {
  return attrs
    .filter(attr => attr.name !== 'src')
    .filter(attr => isStatic(attr.value))
    .map(attr => ({ name: attr.name, value: extractValue(attr.value) }))
    .map(attr => `${attr.name}=${encodeURIComponent(attr.value)}`)
    .join('&')
}

function nodePath (node) {
  return node && node.parent && Array.isArray(node.parent.children)
    ? `${nodePath(node.parent)}-${node.parent.children.indexOf(node)}`
    : ''
}
