const path = require('path')
const LRU = require('lru-cache')
const unified = require('unified')
const remarkHtml = require('remark-html')
const remarkParse = require('remark-parse')
const imagePlugin = require('./plugins/image')

const cache = new LRU({ max: 100 })

const createFile = options => {
  const file = {
    contents: options.contents
  }

  if (options.path) file.path = options.path
  if (options.data) file.data = options.data

  return file
}

const normalizeEntry = entry =>
  typeof entry === 'string'
    ? require(entry)
    : entry

const normalizePlugins = (arr = []) =>
  arr.map(entry => Array.isArray(entry)
    ? [normalizeEntry(entry[0]), entry[1] || {}]
    : [normalizeEntry(entry), {}]
  )

const createResolver = (processor, ext) =>
  async (obj, args, context, info) => {
    const value = obj[info.fieldName] || ''
    const key = info.parentType + info.fieldName + value
    const node = obj.internal ? obj : undefined
    const resourcePath = ext.cwd || (node ? node.internal.origin : undefined)

    if (typeof value !== 'string') {
      return null
    }

    if (cache.has(key)) {
      return cache.get(key)
    }

    const file = createFile({
      contents: value,
      path: resourcePath,
      data: {
        context,
        node
      }
    })

    let html

    try {
      const result = await processor.process(file)
      html = result.contents
    } catch (err) {
      throw new Error(
        `Failed to process ${info.parentType}.${info.fieldName}. ${err.message}`
      )
    }

    cache.set(key, html)

    return html
  }

module.exports = (api, options = {}) => {
  const plugins = normalizePlugins(options.plugins)
  const processor = unified()
    .use(remarkParse, options.parserOptions)
    .use(plugins)
    .use(imagePlugin)
    .use(remarkHtml, options.compilerOptions)

  api.transpileDependencies([path.resolve(__dirname, 'runtime')])

  api.createSchema(({ addSchemaFieldExtension }) => {
    addSchemaFieldExtension({
      name: options.name || 'remark',
      args: { cwd: 'String' },
      apply: ext => ({
        type: 'String',
        resolve: createResolver(processor, ext)
      })
    })
  })
}
