const he = require('he')
const u = require('unist-builder')
const toHTML = require('hast-util-to-html')
const toHAST = require('mdast-util-to-hast')

const {
  genImportBlock,
  genTemplateBlock,
  genFrontMatterBlock
} = require('./codegen')

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
        'g-link' (h, node) {
          return h(node, 'g-link', { to: node.url }, node.children)
        },
        'g-image' (h, node) {
          const props = node.data.hProperties || {}
          return h(node, 'g-image', { src: node.url, alt: node.alt, title: node.title, ...props })
        },
        'text' (h, node) {
          return h.augment(node, u('raw', he.encode(node.value)))
        }
      }
    })

    const html = toHTML(hast, {
      allowDangerousHTML: true,
      entities: {
        useNamedReferences: true
      }
    })

    if (file.data.onlyBlocks) {
      return blocks.join('\n\n')
    }

    if (file.data.onlyTemplate) {
      return genTemplateBlock(html, file)
    }

    if (file.data.withImport !== false) {
      blocks.push(genImportBlock(importStatements, file))
    }

    if (file.data.withTemplate !== false) {
      blocks.unshift(genTemplateBlock(html, file))
    }

    if (file.data.withFrontMatter !== false) {
      blocks.push(genFrontMatterBlock(file.data.data))
    }

    return blocks.join('\n\n')
  }
}
