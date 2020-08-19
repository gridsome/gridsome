const isUrl = require('is-url')
const isRelative = require('is-relative')
const visit = require('unist-util-visit')

module.exports = function attacher (options = {}) {
  return function transform (tree) {
    visit(tree, 'image', node => {
      if (
        options.processImages !== false &&
        isRelative(node.url) &&
        !isUrl(node.url)
      ) {
        const data = node.data = (node.data || {})
        const props = data.hProperties = (data.hProperties || {})

        node.type = 'g-image'

        Object.assign(props, options)
      }
    })
  }
}
