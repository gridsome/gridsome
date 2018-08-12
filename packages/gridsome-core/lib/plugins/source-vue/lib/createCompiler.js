const path = require('path')
const fs = require('fs-extra')
const compiler = require('vue-template-compiler')
const { parse } = require('@vue/component-compiler-utils')

module.exports = () => {
  return {
    parse (file) {
      const filename = path.parse(file).name
      const source = fs.readFileSync(file, 'utf-8')
      const { customBlocks } = parse({ filename, source, compiler })
      const block = customBlocks.filter(block => block.type === 'graphql').shift()

      const res = {
        pageQuery: { content: null }
      }

      if (block) {
        res.pageQuery = {
          content: block.content,
          options: block.attrs
        }
      }

      return res
    }
  }
}
