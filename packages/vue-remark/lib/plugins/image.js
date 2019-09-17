const isRelative = require('is-relative')
const visit = require('unist-util-visit')

module.exports = function attacher () {
  return function transform (tree) {
    visit(tree, 'image', node => {
      if (isRelative(node.url)) {
        node.type = 'g-image'
      }
    })
  }
}
