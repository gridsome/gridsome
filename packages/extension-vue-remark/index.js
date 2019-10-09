const path = require('path')
const LRU = require('lru-cache')
const compiler = require('vue-template-compiler')
const RemarkTransformer = require('@gridsome/transformer-remark')
const { parse, compileTemplate } = require('@vue/component-compiler-utils')

const toSFC = require('@gridsome/vue-remark/lib/toSfc')
const sfcSyntax = require('@gridsome/vue-remark/lib/sfcSyntax')
const toVueRemarkAst = require('@gridsome/vue-remark/lib/toVueRemarkAst')

const createFile = options => {
  const file = {
    contents: options.contents
  }

  if (options.path) file.path = options.path
  if (options.data) file.data = options.data

  return file
}

class VueRemarkExtension {
  static defaultOptions () {
    return {
      name: 'vueRemark',
      plugins: [],
      remark: {}
    }
  }

  constructor (api, options) {
    this.remark = new RemarkTransformer({}, {
      assets: api._app.assets,
      resolveNodeFilePath: api.store._resolveNodeFilePath,
      localOptions: {
        ...options.remark,
        stringifier: toSFC,
        plugins: [
          sfcSyntax,
          toVueRemarkAst,
          ...options.plugins
        ]
      }
    })

    api.transpileDependencies([path.resolve(__dirname, 'src')])

    api.createSchema(({ addSchemaFieldExtension }) => {
      const cache = new LRU({ max: 100 })

      addSchemaFieldExtension({
        name: options.name,
        args: {
          cwd: 'String'
        },
        apply: ext => {
          return {
            type: 'String',
            resolve: async (obj, args, ctx, info) => {
              const node = obj.internal ? obj : undefined
              const resourcePath = ext.cwd || (node ? node.internal.origin : undefined)
              const value = obj[info.fieldName] || ''
              const key = info.fieldName + value

              if (typeof value !== 'string') {
                return null
              }

              if (cache.has(key)) {
                return cache.get(key)
              }

              const source = await this.parse(value, { node, resourcePath })
              const { template } = parse({ source, compiler })

              const result = compileTemplate({
                compiler,
                compilerOptions: {
                  preserveWhitespace: false
                },
                isProduction: process.env.NODE_ENV === 'production',
                preprocessLang: template.lang,
                source: template.content
              })

              const code = `${result.code}\nvar _compiled = true`

              cache.set(key, code)

              return code
            }
          }
        }
      })
    })
  }

  async parse (source, { node, resourcePath }) {
    const { content, ...data } = this.remark.parse(source.trim())

    if (!data.excerpt) data.excerpt = null

    const file = createFile({
      contents: content,
      data: {
        data,
        node
      }
    })

    if (resourcePath) {
      file.path = resourcePath
    }

    const sfc = await this.remark.processor.process(file)

    return sfc.contents
  }
}

module.exports = VueRemarkExtension
