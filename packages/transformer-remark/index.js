const LRU = require('lru-cache')
const unified = require('unified')
const parse = require('gray-matter')
const remarkHtml = require('remark-html')
const remarkParse = require('remark-parse')
const sanitizeHTML = require('sanitize-html')
const { defaultsDeep } = require('lodash')

const cache = new LRU({ max: 1000 })

const {
  cacheKey,
  createFile,
  findHeadings,
  createPlugins
} = require('./lib/utils')

const { estimateTimeToRead } = require('./lib/timeToRead')

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

  constructor (options, context) {
    const { localOptions, resolveNodeFilePath } = context

    this.options = defaultsDeep(localOptions, options)
    this.processor = this.createProcessor(localOptions)
    this.resolveNodeFilePath = resolveNodeFilePath
    this.assets = context.assets || context.queue
  }

  parse (source) {
    const { data, content, excerpt } = parse(source, this.options.grayMatter || {})

    // if no title was found by gray-matter,
    // try to find the first one in the content
    if (!data.title) {
      const title = content.trim().match(/^#+\s+(.*)/)
      if (title) data.title = title[1]
    }

    return { content, excerpt, ...data }
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

            cached = estimateTimeToRead(text, speed)
            cache.set(key, cached)
          }

          return cached
        }
      },
      excerpt: {
        type: GraphQLString,
        args: {
          length: {
            type: GraphQLInt,
            description: 'Maximum length of generated excerpt (characters)',
            defaultValue: 200
          }
        },
        resolve: async (node, { length }) => {
          const key = cacheKey(node, 'excerpt')
          let excerpt = node.excerpt || cache.get(key)

          if (!excerpt) {
            const html = await this._nodeToHTML(node)
            // Remove html tags, then newlines.
            excerpt = sanitizeHTML(html, {
              allowedAttributes: {},
              allowedTags: []
            }).replace(/\r?\n|\r/g, ' ')

            if (length && excerpt.length > length) {
              excerpt = excerpt.substr(0, excerpt.lastIndexOf(' ', length - 1))
            }

            cache.set(key, excerpt)
          }

          return excerpt
        }
      }
    }
  }

  createProcessor (options = {}) {
    const processor = unified().data('transformer', this)
    const plugins = createPlugins(this.options, options)
    const config = this.options.config || {}

    return processor
      .use(remarkParse, config)
      .use(plugins)
      .use(options.stringifier || remarkHtml)
  }

  _nodeToAST (node) {
    const key = cacheKey(node, 'ast')
    let cached = cache.get(key)

    if (!cached) {
      const file = createFile(node)
      const ast = this.processor.parse(file)

      cached = this.processor.run(ast, file)
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

        return this.processor.stringify(ast, file)
      })()

      cache.set(key, cached)
    }

    return Promise.resolve(cached)
  }
}

module.exports = RemarkTransformer
