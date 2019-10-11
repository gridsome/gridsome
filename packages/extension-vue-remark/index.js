const path = require('path')
const LRU = require('lru-cache')
const unified = require('unified')
const remarkParse = require('remark-parse')
const compiler = require('vue-template-compiler')
const { parse, compileTemplate } = require('@vue/component-compiler-utils')

const imagePlugin = require('./plugins/image')
const toSFC = require('@gridsome/vue-remark/lib/toSfc')
const sfcSyntax = require('@gridsome/vue-remark/lib/sfcSyntax')
const toVueRemarkAst = require('@gridsome/vue-remark/lib/toVueRemarkAst')

const cache = new LRU({ max: 100 })
const isProd = process.env.NODE_ENV === 'production'

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
    const key = info.returnType + info.fieldName + value
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
        onlyTemplate: true,
        context,
        node
      }
    })

    let contents
    let template

    try {
      const result = await processor.process(file)
      contents = result.contents
    } catch (err) {
      throw new Error(
        `Failed to process ${info.returnType}.${info.fieldName}. ${err.message}`
      )
    }

    try {
      const result = parse({ source: contents, compiler })
      template = result.template
    } catch (err) {
      throw new Error(
        `Failed to parse ${info.returnType}.${info.fieldName}. ${err.message}`
      )
    }

    const result = compileTemplate({
      compiler,
      compilerOptions: {
        preserveWhitespace: false
      },
      isProduction: isProd,
      preprocessLang: template.lang,
      source: template.content
    })

    const code = `${result.code}\nvar _compiled = true`

    cache.set(key, code)

    return code
  }

module.exports = (api, options = {}) => {
  const plugins = normalizePlugins(options.plugins)
  const processor = unified()
    .use(remarkParse)
    .use(sfcSyntax)
    .use(toVueRemarkAst)
    .use(plugins)
    .use(imagePlugin)
    .use(toSFC)

  api.transpileDependencies([path.resolve(__dirname, 'runtime')])

  api.createSchema(({ addSchemaFieldExtension }) => {
    addSchemaFieldExtension({
      name: options.name || 'vueRemark',
      args: { cwd: 'String' },
      apply: ext => ({
        type: 'String',
        resolve: createResolver(processor, ext)
      })
    })
  })
}
