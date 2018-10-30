const path = require('path')
const fs = require('fs-extra')
const isUrl = require('is-url')
const visit = require('unist-util-visit')

module.exports = function attacher () {
  const node = this.data('node')
  const queue = this.data('queue')
  const context = this.data('context')

  return async function transform (tree, file, callback) {
    const dirname = path.dirname(node.internal.origin)
    const images = []

    if (path.isAbsolute(node.internal.origin)) {
      visit(tree, 'image', node => images.push(node))
    }

    for (const node of images) {
      const imagePath = await getImagePath(node, context, dirname)

      if (!imagePath) continue

      const data = node.data || {}
      const props = data.hProperties || {}
      const classNames = props.class || []

      const { imageHTML, noscriptHTML } = await queue.add(imagePath, {
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

async function getImagePath (node, context, dirname) {
  if (isUrl(node.url)) return ''

  if (/^\//.test(node.url)) {
    const pathName = node.url.replace(/^\/+/, '')
    const relativeToRoot = path.resolve(context, pathName)

    if (await fs.exists(relativeToRoot)) {
      return relativeToRoot
    }
  }

  const relativeToFile = path.resolve(dirname, node.url)

  if (await fs.exists(relativeToFile)) {
    return relativeToFile
  }

  return ''
}
