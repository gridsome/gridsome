const path = require('path')
const fs = require('fs-extra')
const Filesystem = require('@gridsome/source-filesystem')

const sfcSyntax = require('./lib/sfc-syntax')
const toSFC = require('./lib/mdvue-ast-to-sfc')
const toMdVueAST = require('./lib/md-ast-to-mdvue-ast')
const { genFrontMatterBlock } = require('./lib/codegen')
const { normalizeLayout, createFile } = require('./lib/utils')

class MdVuePlugin {
  static defaultOptions () {
    return {
      typeName: 'VueMarkdownPage',
      baseDir: undefined,
      pathPrefix: undefined,
      route: undefined,
      index: ['index'],
      refs: {},
      includePaths: []
    }
  }

  constructor (api, options) {
    if (!options.baseDir) {
      throw new Error('@gridsome/plugin-mdvue requires the baseDir option')
    }

    if (!api.store._transformers['text/markdown']) {
      throw new Error(
        '@gridsome/plugin-mdvue requires a Markdown transformer. ' +
        'Please install the @gridsome/transformer-remark plugin.'
      )
    }

    this.api = api
    this.store = api.store
    this.options = options
    this.filesystem = new Filesystem(api, {
      path: '**/*.md',
      typeName: options.typeName,
      baseDir: options.baseDir,
      pathPrefix: options.pathPrefix,
      route: options.route,
      index: options.index,
      refs: options.refs
    })
    this.remark = this.store._transformers['text/markdown']
    this.context = options.baseDir ? api.resolve(options.baseDir) : api.context

    this.processor = this.remark.createProcessor({
      plugins: [sfcSyntax, toMdVueAST],
      stringifier: toSFC
    })

    api.transpileDependencies([path.resolve(__dirname, 'src')])
    api.registerComponentParser({ test: /\.md/, parse: this.parseComponent.bind(this) })
    api.chainWebpack(config => this.chainWebpack(config))
    api.createPages(args => this.createPages(args))
  }

  parseComponent (resourcePath) {
    const pageQueryRE = /<page-query>([^</]+)<\/page-query>/
    const source = fs.readFileSync(resourcePath, 'utf-8')
    const ast = this.processor.parse(source)

    const pageQuery = ast.children
      .filter(node => node.type === 'html' && /^<page-query/.test(node.value))
      .map(node => pageQueryRE.exec(node.value)[1])
      .pop()

    return { pageQuery }
  }

  chainWebpack (config) {
    const vueLoader = config.module.rule('vue').use('vue-loader')
    const includePaths = this.options.includePaths.map(p => this.api.resolve(p))

    config.module.rule('mdvue')
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
      .use('mdvue-loader')
      .loader(require.resolve('./lib/loader.js'))
      .options(this)
  }

  async createPages ({ getContentType, createPage }) {
    const contentType = getContentType(this.options.typeName)

    contentType.collection.find().forEach(node => {
      createPage({
        path: node.path,
        component: node.internal.origin,
        queryVariables: node
      })
    })
  }

  async parse (source, resourcePath = null) {
    const { content, ...data } = this.remark.parse(source.trim())
    const defaultLayout = resourcePath.startsWith(this.context)
      ? this.options.layout
      : require.resolve('./src/MdVueLayout')
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

module.exports = MdVuePlugin
