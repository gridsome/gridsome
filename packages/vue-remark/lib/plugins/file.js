const path = require('path')
const isRelative = require('is-relative')
const visit = require('unist-util-visit')

module.exports = function attacher () {
  return function transform (tree) {
    visit(tree, 'link', node => {
      if (isRelative(node.url) && path.extname(node.url)) {
        node.type = 'g-link'
      }
    })
  }
}
