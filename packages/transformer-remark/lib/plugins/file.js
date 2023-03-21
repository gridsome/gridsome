const visit = require('unist-util-visit')

module.exports = function attacher () {
  const transformer = this.data('transformer')

  return async function transform (tree, file, callback) {
    if (!transformer) return callback()
    if (!file.path) return callback()

    const links = []

    visit(tree, 'link', node => links.push(node))

    for (const node of links) {
      const path = file.data.node
        ? transformer.resolveNodeFilePath(file.data.node, node.url)
        : node.url

      try {
        const asset = await transformer.assets.add(path)
        node.url = asset.src
      } catch (err) {
        callback(err)
        return
      }
    }

    callback()
  }
}
