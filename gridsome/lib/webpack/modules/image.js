module.exports = () => ({
  postTransformNode (node) {
    if (node.tag === 'g-image') {
      for (const attr of node.attrs) {
        if (attr.name === 'src') {
          if (!isStatic(attr.value)) return

          const value = extractValue(attr.value)
          const query = createOptionsQuery(node.attrs)

          attr.value = `require("!!image-loader?${query}!${value}")`

          return
        }
      }
    }
  }
})

function isStatic (value) {
  return /^\"[^"]+\"$/.test(value)
}

function extractValue (value) {
  return value.substr(1, value.length - 2)
}

function createOptionsQuery (attrs) {
  return attrs
    .filter(attr => attr.name !== 'src')
    .filter(attr => isStatic(attr.value))
    .map(attr => `${attr.name}=${extractValue(attr.value)}`)
    .join('&')
}
