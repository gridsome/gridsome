const corejsPath = require('path').dirname(require.resolve('core-js/package.json')).replace(/\\/g, '/')

module.exports = () => ({
  visitor: {
    ImportDeclaration(path) {
      if (path.node.specifiers.length !== 0 || path.node.source.value.indexOf('core-js/') !== 0) {
        return
      }

      path.node.source.value = corejsPath + path.node.source.value.substr('core-js'.length)
    }
  }
})
