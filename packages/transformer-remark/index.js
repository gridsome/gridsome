const unified = require('unified')
const parse = require('gray-matter')
const { words, defaultsDeep } = require('lodash')
const remarkParse = require('remark-parse')
const remarkHtml = require('remark-html')
const htmlToText = require('html-to-text')

const {
  createFile,
  findHeadings,
  createPlugins
} = require('./lib/utils')

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

  constructor (options, { localOptions, nodeCache, nodeCacheSync, context, queue }) {
    this.options = defaultsDeep(localOptions, options)
    this.nodeCache = nodeCache
    this.context = context
    this.queue = queue

    this.plugins = createPlugins(this.options, options.plugins.concat(localOptions.plugins))
    this.toAST = unified().use(remarkParse).parse
    this.applyPlugins = unified().data('transformer', this).use(this.plugins).run
    this.toHTML = unified().use(remarkHtml).stringify
  }

  parse (source) {
    const { data: fields, content, excerpt } = parse(source)

    // if no title was found by gray-matter,
    // try to find the first one in the content
    if (!fields.title) {
      const title = content.trim().match(/^#+\s+(.*)/)
      if (title) fields.title = title[1]
    }

    return {
      title: fields.title,
      slug: fields.slug,
      path: fields.path,
      date: fields.date,
      content,
      excerpt,
      fields
    }
  }

  extendNodeType () {
    return {
      content: {
        type: GraphQLString,
        resolve: node => this._toHTML(node)
      },
      headings: {
        type: new GraphQLList(HeadingType),
        args: {
          depth: { type: HeadingLevels },
          stripTags: { type: GraphQLBoolean, defaultValue: true }
        },
        resolve: async (node, { depth, stripTags }) => {
          const headings = await this.nodeCache(node, 'headings', async () => {
            const ast = await this._toAST(node)
            return findHeadings(ast)
          })

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
          const html = await this._toHTML(node)
          const text = htmlToText.fromString(html)
          const count = words(text).length

          return Math.round(count / speed) || 1
        }
      }
    }
  }

  createProcessor (options) {
    let processor = unified()
      .data('transformer', this)
      .use(remarkParse)

    processor = processor.use(this.plugins)

    if (Array.isArray(options.plugins)) {
      processor = processor.use(options.plugins)
    }

    return processor
  }

  _toAST (node) {
    const file = createFile({
      contents: node.content,
      path: node.internal.origin
    })

    return this.nodeCache(node, 'ast', () => {
      return this.applyPlugins(this.toAST(file), file)
    })
  }

  _toHTML (node) {
    return this.nodeCache(node, 'html', async () => {
      const ast = await this._toAST(node)
      return this.toHTML(ast, createFile({
        contents: node.content,
        path: node.internal.origin
      }))
    })
  }
}

module.exports = RemarkTransformer
