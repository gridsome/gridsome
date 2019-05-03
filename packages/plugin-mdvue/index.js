const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const chokidar = require('chokidar')

const sfcSyntax = require('./lib/sfc-syntax')
const toSFC = require('./lib/mdvue-ast-to-sfc')
const toMdVueAST = require('./lib/md-ast-to-mdvue-ast')
const { genFrontMatterBlock } = require('./lib/codegen')
const { normalizeLayout, createFile } = require('./lib/utils')

class MdVuePlugin {
  static defaultOptions () {
    return {
      typeName: 'VueMarkdownPage',
      route: undefined,
      baseDir: undefined,
      index: ['index'],
      includePaths: [],
      pathPrefix: '/',
      plugins: []
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
    this.remark = this.store._transformers['text/markdown']
    this.context = options.baseDir ? api.resolve(options.baseDir) : api.context

    this.processor = this.remark.createProcessor({
      plugins: [sfcSyntax, toMdVueAST, toSFC]
    })

    api.transpileDependencies([path.resolve(__dirname, 'src')])
    api.registerComponentParser({ test: /\.md/, parse: this.parseComponent.bind(this) })
    api.chainWebpack(config => this.chainWebpack(config))
    api.loadSource(args => this.loadFiles(args))
    api.createPages(args => this.createPages(args))
  }

  parseComponent (resourcePath) {
    const pageQueryRE = /<page-query>([^</]+)<\/page-query>/
    const source = fs.readFileSync(resourcePath, 'utf-8')
    const ast = this.remark.toAST(source)

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

  async loadFiles (store) {
    const files = await glob('**/*.md', { cwd: this.context })
    const contentType = store.addContentType({
      typeName: this.options.typeName,
      route: this.options.route
    })

    await Promise.all(files.map(async file => {
      const options = await this.createNodeOptions(file)
      contentType.addNode(options)
    }))

    if (process.env.NODE_ENV === 'development') {
      this.watch(contentType)
    }
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

  async createNodeOptions (file) {
    const { pathPrefix } = this.options
    const origin = path.join(this.context, file)
    const relPath = path.relative(this.context, file)
    const mimeType = this.store.mime.lookup(file)
    const content = await fs.readFile(origin, 'utf8')
    const id = this.store.makeUid(relPath)
    const { dir, name, ext = '' } = path.parse(file)
    const routePath = this.normalizePath(file, pathPrefix)

    return {
      id,
      path: routePath,
      fileInfo: {
        extension: ext,
        directory: dir,
        path: file,
        name
      },
      internal: {
        mimeType,
        content,
        origin
      }
    }
  }

  normalizePath (file, pathPrefix) {
    if (this.options.route) return null

    const { dir, name } = path.parse(file)
    const segments = (pathPrefix + dir)
      .split('/')
      .filter(s => s)
      .map(s => this.store.slugify(s))

    if (!this.options.index.includes(name)) {
      segments.push(this.store.slugify(name))
    }

    return `/${segments.join('/')}`
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

  watch (contentType) {
    const watcher = chokidar.watch('**/*.md', {
      ignoreInitial: true,
      cwd: this.context
    })

    watcher.on('add', async file => {
      const options = await this.createNodeOptions(slash(file))
      contentType.addNode(options)
    })

    watcher.on('unlink', file => {
      contentType.removeNode({
        'internal.origin': path.join(this.context, slash(file))
      })
    })

    watcher.on('change', async file => {
      const options = await this.createNodeOptions(slash(file))
      contentType.updateNode(options)
    })
  }
}

module.exports = MdVuePlugin
