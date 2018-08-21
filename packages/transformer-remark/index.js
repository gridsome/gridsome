const Remark = require('remark')
// const html = require('remark-html')
const parse = require('gray-matter')
// const format = require('rehype-format')
const visit = require('unist-util-visit')
const toHAST = require('mdast-util-to-hast')
const hastToHTML = require('hast-util-to-html')
// const markdown = require('remark-parse')
// const stringify = require('rehype-stringify')
// const { mapValues, isDate } = require('lodash')
const { HeadingType, HeadingLevels } = require('./lib/types/HeadingType')

const {
  GraphQLList,
  GraphQLString
} = require('gridsome/graphql')

class RemarkTransformer {
  static mimeTypes () {
    return ['text/markdown', 'text/x-markdown']
  }

  constructor (options, { nodeCache }) {
    this.options = options
    this.nodeCache = nodeCache
  }

  parse (source) {
    const file = parse(source, this.options.frontmatter || {})

    return {
      fields: file.data,
      content: file.content,
      excerpt: file.excerpt
    }
  }

  extendNodeType () {
    return {
      content: {
        type: GraphQLString,
        resolve: node => this.toHTML(node)
      },
      headings: {
        type: new GraphQLList(HeadingType),
        args: {
          depth: { type: HeadingLevels }
        },
        resolve: (node, { depth }) => {
          return this.findHeadings(node, depth).filter(heading => {
            return typeof depth === 'number'
              ? heading.depth === depth
              : true
          })
        }
      }
    }
  }

  toAST (node) {
    return this.nodeCache(node, 'ast', () => {
      const remark = new Remark().data('settings', {
        commonmark: true,
        footnotes: true,
        pedantic: true
      })

      return remark.parse(node.internal.content)
    })
  }

  toHAST (node) {
    return this.nodeCache(node, 'hast', () => {
      const ast = this.toAST(node)
      return toHAST(ast, { allowDangerousHTML: true })
    })
  }

  toHTML (node) {
    return this.nodeCache(node, 'html', () => {
      const htmlAst = this.toHAST(node)
      return hastToHTML(htmlAst, { allowDangerousHTML: true })
    })
  }

  findHeadings (node) {
    return this.nodeCache(node, 'headings', () => {
      const ast = this.toAST(node)
      const headings = []

      visit(ast, 'heading', ({ depth, children }) => {
        if (children.length && children[0].type === 'text') {
          headings.push({ depth, value: children[0].value })
        }
      })

      return headings
    })
  }
}

module.exports = RemarkTransformer
