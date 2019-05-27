const path = require('path')
const fs = require('fs-extra')
const Filesystem = require('@gridsome/source-filesystem')
const RemarkTransformer = require('@gridsome/transformer-remark')

const toSFC = require('./lib/toSfc')
const sfcSyntax = require('./lib/sfcSyntax')
const toVueRemarkAst = require('./lib/toVueRemarkAst')
const { genFrontMatterBlock } = require('./lib/codegen')
const { normalizeLayout, createFile } = require('./lib/utils')

class VueRemark {
  static defaultOptions () {
    return {
      typeName: undefined,
      baseDir: undefined,
      pathPrefix: undefined,
      component: undefined,
      route: undefined,
      index: ['index'],
      includePaths: [],
      refs: {}
    }
  }

  constructor (api, options) {
    if (!options.baseDir) {
      throw new Error(`@gridsome/vue-remark requires the 'baseDir' option.`)
    }

    if (!options.typeName) {
      throw new Error(`@gridsome/vue-remark requires the 'typeName' option.`)
    }

    this.api = api
    this.store = api.store
    this.options = options
    this.context = options.baseDir ? api.resolve(options.baseDir) : api.context
    this.component = options.component ? api.resolve(options.component) : null

    this.filesystem = new Filesystem(api, {
      path: '**/*.md',
      typeName: options.typeName,
      baseDir: options.baseDir,
      pathPrefix: options.pathPrefix,
      route: options.route,
      index: options.index,
      refs: options.refs
    })

    api.store._addTransformer(RemarkTransformer, options.remark)

    this.remark = api.store._transformers['text/markdown']

    this.processor = this.remark.createProcessor({
      plugins: [sfcSyntax, toVueRemarkAst],
      stringifier: toSFC
    })

    api.transpileDependencies([path.resolve(__dirname, 'src')])
    api.chainWebpack(config => this.chainWebpack(config))
    api.createPages(args => this.createPages(args))

    api.registerComponentParser({
      test: /\.md/,
      parse: this.parseComponent.bind(this)
    })

    api.___onCreateContentType(options => {
      if (options.typeName === this.options.typeName) {
        options.component = false
      }
    })
  }

  parseComponent (resourcePath) {
    const pageQueryRE = /<page-query>([^</]+)<\/page-query>/
    const source = fs.readFileSync(resourcePath, 'utf-8')
    const ast = this.processor.parse(source)

    return {
      pageQuery: ast.children
        .filter(node => node.type === 'html' && /^<page-query/.test(node.value))
        .map(node => pageQueryRE.exec(node.value)[1])
        .pop()
    }
  }

  chainWebpack (config) {
    const vueLoader = config.module.rule('vue').use('vue-loader')
    const includePaths = this.options.includePaths.map(p => this.api.resolve(p))

    config.module.rule('vue-remark')
      .test(/\.md$/)
      .include
      .add(resourcePath => {
        if (includePaths.some(path => resourcePath.startsWith(path))) {
          return true
        }

        return resourcePath.startsWith(this.context)
      })
      .end()
      .use('vue-loader')
      .loader('vue-loader')
      .options(vueLoader.toConfig().options)
      .end()
      .use('vue-remark-loader')
      .loader(require.resolve('./lib/loader.js'))
      .options(this)
  }

  async createPages ({ getContentType, createPage }) {
    const contentType = getContentType(this.options.typeName)

    contentType.collection.find().forEach(node => {
      if (this.component) {
        createPage({
          path: node.path,
          component: this.component,
          queryVariables: node,
          _meta: {
            vueRemark: {
              type: 'import',
              path: node.internal.origin
            }
          }
        })
      } else {
        createPage({
          path: node.path,
          component: node.internal.origin,
          queryVariables: node
        })
      }
    })
  }

  async parse (source, resourcePath = null) {
    const { content, ...data } = this.remark.parse(source.trim())
    const defaultLayout = require.resolve('./src/VueRemarkLayout.js')
    const layout = normalizeLayout(data.layout || defaultLayout)
    const frontMatterBlock = genFrontMatterBlock(data)

    if (!data.layout && !path.isAbsolute(layout.component)) {
      layout.component = path.resolve(this.api.context, layout.component)
    }

    const file = createFile({
      contents: content,
      path: resourcePath,
      data: { layout }
    })

    if (resourcePath) {
      file.path = resourcePath
    }

    const sfc = await this.processor.process(file)

    return `${sfc}\n\n${frontMatterBlock}`
  }
}

module.exports = VueRemark
