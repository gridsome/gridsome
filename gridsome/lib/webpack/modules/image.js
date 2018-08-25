const path = require('path')

module.exports = () => ({
  postTransformNode (node) {
    if (node.tag === 'g-image') {
      for (const attr of node.attrs) {
        if (attr.name === 'src') {
          if (!isStatic(attr.value)) return

          const value = extractValue(attr.value)
          const query = createOptionsQuery(node.attrs)
          const loader = path.resolve(__dirname, '../loaders/image-loader.js')

          attr.value = `require("!!${loader}?${query}!${value}")`

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
