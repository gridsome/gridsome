const path = require('path')
const isUrl = require('is-url')
const visit = require('unist-util-visit')
const isRelative = require('is-relative')

module.exports = function attacher (options = {}) {
  return async function transform (tree, file, callback) {
    if (!file.path) return callback()

    const dirname = path.dirname(file.path)
    const { context } = file.data
    const images = []

    visit(tree, 'image', node => images.push(node))

    for (const node of images) {
      const data = node.data || {}
      const props = data.hProperties || {}
      const classNames = props.class || []

      if (isUrl(node.url) || !isRelative(node.url)) {
        continue
      }

      const imagePath = path.resolve(dirname, node.url)

      let imageHTML = null
      let noscriptHTML = null

      try {
        const asset = await context.assets.add(imagePath, {
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
