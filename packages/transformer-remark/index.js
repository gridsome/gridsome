const path = require('path')
const isUrl = require('is-url')
const remark = require('remark')
const parse = require('gray-matter')
const words = require('lodash.words')
const visit = require('unist-util-visit')
const htmlToText = require('html-to-text')
const toHAST = require('mdast-util-to-hast')
const hastToHTML = require('hast-util-to-html')
const { HeadingType, HeadingLevels } = require('./lib/types/HeadingType')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString
} = require('gridsome/graphql')

class RemarkTransformer {
  static mimeTypes () {
    return ['text/markdown', 'text/x-markdown']
  }

  constructor (options, { localOptions, nodeCache, queue }) {
    this.options = options
    this.localOptions = this.localOptions
    this.nodeCache = nodeCache
    this.queue = queue

    this.remarkPlugins = this.normalizePlugins([
      // built-in plugins
      'remark-slug',
      'remark-fix-guillemets',
      'remark-squeeze-paragraphs',
      ['remark-external-links', {
        target: options.externalLinksTarget,
        rel: options.externalLinksRel
      }],
      ['remark-autolink-headings', {
        content: {
          type: 'element',
          tagName: 'span',
          properties: {
            className: options.anchorClassName || 'icon icon-link'
          }
        }
      }],
      // user plugins
      ...options.plugins || [],
      ...localOptions.plugins || []
    ])
  }

  parse (source) {
    const file = parse(source)

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
      },
      timeToRead: {
        type: GraphQLInt,
        args: {
          speed: {
            type: GraphQLInt,
            description: 'Words per minute',
            defaultValue: 230
          }
        },
        resolve: (node, { speed }) => {
          const html = this.toHTML(node)
          const text = htmlToText.fromString(html)
          const count = words(text).length

          return Math.round(count / speed) || 1
        }
      }
    }
  }

  normalizePlugins (arr = []) {
    return arr.map(entry => {
      return Array.isArray(entry)
        ? [require(entry[0]), entry[1] || {}]
        : [require(entry), {}]
    })
  }

  toAST (node) {
    return this.nodeCache(node, 'ast', () => {
      const ast = remark().parse(node.internal.content)

      // apply remark transforms to ast
      for (const [attacher, options] of this.remarkPlugins) {
        attacher(options)(ast)
      }

      return ast
    })
  }

  toHAST (node) {
    return this.nodeCache(node, 'hast', () => {
      const mdast = this.toAST(node)
      const options = { allowDangerousHTML: true }

      if (path.isAbsolute(node.internal.origin)) {
        const dirname = path.dirname(node.internal.origin)

        // - serve images with an express endpoint in dev
        // - add images to a process queue and return an url in build
        visit(mdast, 'image', node => {
          if (!isUrl(node.url)) {
            node.url = this.queue.add(
              path.resolve(dirname, node.url)
            )
          }
        })
      }

      return toHAST(mdast, options)
    })
  }

  toHTML (node) {
    return this.nodeCache(node, 'html', () => {
      const hast = this.toHAST(node)
      const options = { allowDangerousHTML: true }

      return hastToHTML(hast, options)
    })
  }

  findHeadings (node) {
    return this.nodeCache(node, 'headings', () => {
      const ast = this.toAST(node)
      const headings = []

      visit(ast, 'heading', node => {
        const heading = { depth: node.depth, value: '', anchor: '' }

        visit(node, 'link', link => (heading.anchor = link.url))
        visit(node, 'text', text => (heading.value = text.value))

        headings.push(heading)
      })

      return headings
    })
  }
}

module.exports = RemarkTransformer
