const path = require('path')
const isUrl = require('is-url')
const isRelative = require('is-relative')
const visit = require('unist-util-visit')

module.exports = function attacher (options = {}) {
  return function transform (tree) {
    visit(tree, 'link', node => {
      if (
        !isUrl(node.url) &&
        isRelative(node.url) &&
        path.extname(node.url) &&
        options.processFiles !== false &&
        !/^mailto:/.test(node.url)
      ) {
        node.type = 'g-link'
      }
    })
  }
}
