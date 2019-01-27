const path = require('path')
const visit = require('unist-util-visit')

module.exports = function attacher () {
  const { queue } = this.data('transformer')

  return async function transform (tree, file, callback) {
    if (!file.path) return callback()

    const dirname = path.dirname(file.path)
    const images = []

    visit(tree, 'image', node => {
      if (node.url.startsWith('.')) {
        images.push(node)
      }
    })

    for (const node of images) {
      const filePath = path.resolve(dirname, node.url)

      const data = node.data || {}
      const props = data.hProperties || {}
      const classNames = props.class || []

      const { imageHTML, noscriptHTML } = await queue.add(filePath, {
        alt: props.alt || node.alt,
        width: props.width,
        height: props.height,
        classNames
      })

      node.type = 'html'
      node.value = imageHTML + noscriptHTML
    }

    callback()
  }
}
