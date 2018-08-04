const path = require('path')
const fs = require('fs-extra')
const compiler = require('vue-template-compiler')
const { parse } = require('@vue/component-compiler-utils')

module.exports = () => {
  return {
    async parse (file) {
      const filename = path.parse(file).name
      const source = await fs.readFile(file, 'utf-8')
      const { customBlocks } = parse({ filename, source, compiler })
      const gqlBlock = customBlocks.filter(block => block.type === 'graphql').shift()

      const res = {
        graphql: {}
      }

      if (gqlBlock) {
        res.graphql = {
          query: gqlBlock.content,
          options: gqlBlock.attrs
        }

        if (filename.charAt(0) === '_') {
          res.graphql.nodeType = filename.substring(1)
        }
      }

      return res
    }
  }
}
