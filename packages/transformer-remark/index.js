const unified = require('unified')
const parse = require('gray-matter')
const words = require('lodash.words')
const remarkParse = require('remark-parse')
const remarkHtml = require('remark-html')
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
  GraphQLString,
  GraphQLBoolean
} = require('gridsome/graphql')

class RemarkTransformer {
  static mimeTypes () {
    return ['text/markdown', 'text/x-markdown']
  }

  constructor (options, { localOptions, context, nodeCache, queue }) {
    this.options = options
    this.localOptions = localOptions
    this.context = context
    this.nodeCache = nodeCache
    this.queue = queue

    this.remarkPlugins = normalizePlugins([
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
            className: options.autolinkClassName || 'icon icon-link'
          }
        },
        linkProperties: {
          'aria-hidden': 'true'
        },
        ...options.autolinkHeadings,
        ...localOptions.autolinkHeadings
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
        resolve: node => this.stringifyNode(node)
      },
      headings: {
        type: new GraphQLList(HeadingType),
        args: {
          depth: { type: HeadingLevels },
          stripTags: { type: GraphQLBoolean, defaultValue: true }
        },
        resolve: async (node, { depth, stripTags }) => {
          const headings = await this.findHeadings(node)

          return headings
            .filter(heading =>
              typeof depth === 'number' ? heading.depth === depth : true
            )
            .map(heading => ({
              depth: heading.depth,
              anchor: heading.anchor,
              value: stripTags
                ? heading.value.replace(/(<([^>]+)>)/ig, '')
                : heading.value
            }))
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
        resolve: async (node, { speed }) => {
          const html = await this.stringifyNode(node)
          const text = htmlToText.fromString(html)
          const count = words(text).length

          return Math.round(count / speed) || 1
        }
      }
    }
  }

  parseNode (node) {
    const content = node.fields.__remarkContent

    return this.nodeCache(node, 'tree', () => {
      return unified().use(remarkParse).parse(content)
    })
  }

  transformNode (node) {
    return this.nodeCache(node, 'ast', async () => {
      const tree = await this.parseNode(node)

      return unified()
        .data('node', node)
        .data('queue', this.queue)
        .data('context', this.context)
        .use(this.remarkPlugins)
        .run(tree)
    })
  }

  stringifyNode (node) {
    return this.nodeCache(node, 'html', async () => {
      const ast = await this.transformNode(node)

      return unified().use(remarkHtml).stringify(ast)
    })
  }

  findHeadings (node) {
    return this.nodeCache(node, 'headings', async () => {
      const ast = await this.transformNode(node)
      const headings = []

      visit(ast, 'heading', node => {
        const heading = { depth: node.depth, value: '', anchor: '' }
        const children = node.children || []

        for (let i = 0, l = children.length; i < l; i++) {
          const el = children[i]

          if (el.type === 'link') {
            heading.anchor = el.url
          } else if (el.value) {
            heading.value += el.value
          }
        }

        headings.push(heading)
      })

      return headings
    })
  }
}

module.exports = RemarkTransformer
