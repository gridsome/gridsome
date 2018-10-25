const unified = require('unified')
const parse = require('gray-matter')
const words = require('lodash.words')
const markdown = require('remark-parse')
const visit = require('unist-util-visit')
const htmlToText = require('html-to-text')
const { normalizePlugins } = require('./lib/utils')

const imagePlugin = require('./lib/plugins/image')

const {
  HeadingType,
  HeadingLevels
} = require('./lib/types/HeadingType')

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

    this.remarkPlugins = normalizePlugins([
      // built-in plugins
      'remark-parse',
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
        },
        linkProperties: {
          'aria-hidden': 'true'
        }
      }],
      // built-in plugins
      imagePlugin,
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
        resolve: async (node, { depth }) => {
          const headings = await this.findHeadings(node, depth)
          return headings.filter(heading => {
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

  toAST (node) {
    return this.nodeCache(node, 'ast', () => {
      return unified()
        .use(markdown)
        .parse(node.internal.content)
    })
  }

  toHTML (node) {
    return this.nodeCache(node, 'html', () => {
      return unified()
        .data('node', node)
        .data('queue', this.queue)
        .use(this.remarkPlugins)
        .use(require('remark-html'))
        .process(node.internal.content)
    })
  }

  findHeadings (node) {
    return this.nodeCache(node, 'headings', async () => {
      const ast = await this.toAST(node)
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
