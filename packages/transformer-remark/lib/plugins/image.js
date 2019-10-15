const visit = require('unist-util-visit')

module.exports = function attacher (options = {}) {
  const transformer = this.data('transformer')

  return async function transform (tree, file, callback) {
    if (!transformer) return callback()
    if (!file.path) return callback()

    const images = []

    visit(tree, 'image', node => images.push(node))

    for (const node of images) {
      const data = node.data || {}
      const props = data.hProperties || {}
      const classNames = props.class || []

      const path = file.data.node
        ? transformer.resolveNodeFilePath(file.data.node, node.url)
        : node.url

      let imageHTML = null
      let noscriptHTML = null

      try {
        const asset = await transformer.assets.add(path, {
          alt: props.alt || node.alt,
          width: props.width,
          height: props.height,
          classNames,
          ...options
        })

        imageHTML = asset.imageHTML
        noscriptHTML = asset.noscriptHTML
      } catch (err) {
        callback(err)
        return
      }

      if (imageHTML) {
        node.type = 'html'
        node.value = imageHTML + noscriptHTML
      }
    }

    callback()
  }
}
