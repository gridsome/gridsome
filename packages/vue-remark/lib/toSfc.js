const he = require('he')
const u = require('unist-builder')
const toHTML = require('hast-util-to-html')
const toHAST = require('mdast-util-to-hast')
const { genImportBlock, genTemplateBlock } = require('./codegen')

module.exports = function toSfc () {
  this.Compiler = compiler

  function compiler (node, file) {
    const ast = { type: 'root', children: [] }
    const importStatements = []
    const blocks = []

    file.data = file.data || {}
    file.data.layout = file.data.layout || {}

    node.children.forEach(node => {
      if (node.type === 'vue-remark:import') importStatements.push(node.value)
      else if (node.type === 'vue-remark:block') blocks.push(node.value)
      else ast.children.push(node)
    })

    const hast = toHAST(ast, {
      allowDangerousHTML: true,
      handlers: {
        text (h, node) {
          return h.augment(node, u('raw', he.encode(node.value)))
        }
      }
    })

    const html = toHTML(hast, { allowDangerousHTML: true })

    blocks.push(genImportBlock(importStatements, file))
    blocks.unshift(genTemplateBlock(html, file))

    return blocks.join('\n\n')
  }
}
