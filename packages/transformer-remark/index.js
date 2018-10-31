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

  constructor (options, { localOptions, context, nodeCache, queue }) {
    this.options = options
    this.localOptions = this.localOptions
    this.context = context
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
    const { data, content, excerpt } = parse(source)

    // if no title was found by gray-matter,
    // try to find the first one in the content
    if (!data.title) {
      const title = content.trim().match(/^#+\s+(.*)/)
      if (title) data.title = title[1]
    }

    data.__remarkContent = content
    data.__remarkExcerpt = excerpt

    return {
      title: data.title,
      slug: data.slug,
      path: data.path,
      date: data.date,
      fields: data
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
        .parse(node.fields.__remarkContent)
    })
  }

  toHTML (node) {
    return this.nodeCache(node, 'html', () => {
      return unified()
        .data('node', node)
        .data('queue', this.queue)
        .data('context', this.context)
        .use(this.remarkPlugins)
        .use(require('remark-html'))
        .process(node.fields.__remarkContent)
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
