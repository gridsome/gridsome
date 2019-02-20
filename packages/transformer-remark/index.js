const LRU = require('lru-cache')
const unified = require('unified')
const parse = require('gray-matter')
const remarkHtml = require('remark-html')
const remarkParse = require('remark-parse')
const sanitizeHTML = require('sanitize-html')
const { words, defaultsDeep } = require('lodash')

const cache = new LRU({ max: 1000 })

const {
  cacheKey,
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

  constructor (options, { localOptions, resolveNodeFilePath, queue }) {
    this.options = defaultsDeep(localOptions, options)
    this.resolveNodeFilePath = resolveNodeFilePath
    this.queue = queue

    const plugins = (options.plugins || []).concat(localOptions.plugins || [])

    this.plugins = createPlugins(this.options, plugins)
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
        resolve: node => this._nodeToHTML(node)
      },
      headings: {
        type: new GraphQLList(HeadingType),
        args: {
          depth: { type: HeadingLevels },
          stripTags: { type: GraphQLBoolean, defaultValue: true }
        },
        resolve: async (node, { depth, stripTags }) => {
          const key = cacheKey(node, 'headings')
          let headings = cache.get(key)

          if (!headings) {
            const ast = await this._nodeToAST(node)
            headings = findHeadings(ast)
            cache.set(key, headings)
          }

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
          const key = cacheKey(node, 'timeToRead')
          let cached = cache.get(key)

          if (!cached) {
            const html = await this._nodeToHTML(node)
            const text = sanitizeHTML(html, {
              allowedAttributes: {},
              allowedTags: []
            })

            const count = words(text).length
            cached = Math.round(count / speed) || 1
            cache.set(key, cached)
          }

          return cached
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

  _nodeToAST (node) {
    const key = cacheKey(node, 'ast')
    let cached = cache.get(key)

    if (!cached) {
      const file = createFile(node)
      const ast = this.toAST(file)

      cached = this.applyPlugins(ast, file)
      cache.set(key, cached)
    }

    return Promise.resolve(cached)
  }

  _nodeToHTML (node) {
    const key = cacheKey(node, 'html')
    let cached = cache.get(key)

    if (!cached) {
      cached = (async () => {
        const file = createFile(node)
        const ast = await this._nodeToAST(node)

        return this.toHTML(ast, file)
      })()

      cache.set(key, cached)
    }

    return Promise.resolve(cached)
  }
}

module.exports = RemarkTransformer
