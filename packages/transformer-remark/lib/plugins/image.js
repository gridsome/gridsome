const path = require('path')
const isUrl = require('is-url')
const visit = require('unist-util-visit')

module.exports = function attacher () {
  const node = this.data('node')
  const queue = this.data('queue')

  return async function transform (tree, file, callback) {
    const dirname = path.dirname(node.internal.origin)
    const images = []

    if (path.isAbsolute(node.internal.origin)) {
      visit(tree, 'image', node => {
        if (isLocalPath(node.url)) images.push(node)
      })
    }

    for (const node of images) {
      const data = node.data || {}
      const props = data.hProperties || {}
      const classNames = props.class || []

      const { imageHTML, noscriptHTML } = await queue.add(
        path.resolve(dirname, node.url),
        {
          alt: props.alt || node.alt,
          width: props.width,
          height: props.height,
          classNames
        }
      )

      node.type = 'html'
      node.value = imageHTML + noscriptHTML
    }

    callback()
  }
}

function isLocalPath (string) {
  if (/^\//.test(string)) return false
  return !isUrl(string)
}
