const path = require('path')
const isRelative = require('is-relative')
const visit = require('unist-util-visit')

module.exports = function attacher (options = {}) {
  return function transform (tree) {
    visit(tree, 'link', node => {
      if (
        isRelative(node.url) &&
        path.extname(node.url) &&
        options.processFiles !== false
      ) {
        node.type = 'g-link'
      }
    })
  }
}
