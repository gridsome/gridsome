const path = require('path')
const pathToRegexp = require('path-to-regexp')
const Filesystem = require('@gridsome/source-filesystem')
const RemarkTransformer = require('@gridsome/transformer-remark')
const { trimEnd } = require('lodash')

const toSFC = require('./lib/toSfc')
const sfcSyntax = require('./lib/sfcSyntax')
const toVueRemarkAst = require('./lib/toVueRemarkAst')
const remarkFilePlugin = require('./lib/plugins/file')
const remarkImagePlugin = require('./lib/plugins/image')
const { genFrontMatterBlock } = require('./lib/codegen')

const {
  createFile,
  makePathParams,
  normalizeLayout
} = require('./lib/utils')

const normalizeRouteKeys = keys => keys
  .filter(key => typeof key.name === 'string')
  .map(key => {
    // separate field name from suffix
    const [, fieldName, suffix] = (
      key.name.match(/^(.*[^_])_([a-z]+)$/) ||
      [null, key.name, null]
    )

    const path = fieldName.split('__')

    return {
      name: key.name,
      path,
      fieldName,
      repeat: key.repeat,
      suffix
    }
  })

// TODO: refactor and clean up

class VueRemark {
  static defaultOptions () {
    return {
      typeName: undefined,
      baseDir: undefined,
      pathPrefix: undefined,
      template: undefined,
      index: ['index'],
      includePaths: [],
      plugins: [],
      remark: {},
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
    this.options = options
    this.context = options.baseDir ? api.resolve(options.baseDir) : api.context

    if (typeof options.template === 'string') {
      this.template = api.resolve(options.template)
    }

    if (typeof options.route === 'string') {
      this.route = {
        path: trimEnd(options.route, '/') || '/'
      }

      if (api.config.permalinks.trailingSlash) {
        this.route.path = trimEnd(this.route.path, '/') + '/'
      }

      const routeKeys = []
      pathToRegexp(this.route.path, routeKeys)

      this.route.createPath = pathToRegexp.compile(this.route.path)
      this.route.routeKeys = normalizeRouteKeys(routeKeys)
    }

    this.filesystem = new Filesystem(api, {
      path: '**/*.md',
      typeName: options.typeName,
      baseDir: options.baseDir,
      pathPrefix: options.pathPrefix,
      index: options.index,
      refs: options.refs
    })

    this.remark = new RemarkTransformer({}, {
      assets: api._app.assets,
      localOptions: {
        ...options.remark,
        processFiles: false,
        processImages: false,
        stringifier: toSFC,
        plugins: [
          sfcSyntax,
          toVueRemarkAst,
          remarkFilePlugin,
          remarkImagePlugin,
          ...options.plugins
        ]
      }
    })

    api.transpileDependencies([path.resolve(__dirname, 'src')])
    api.chainWebpack(config => this.chainWebpack(config))
    api.createPages(actions => this.createPages(actions))

    api._app.pages.hooks.parseComponent.for('md').tap('VueRemark', source => {
      const pageQueryRE = /<page-query>([^</]+)<\/page-query>/
      const ast = this.remark.processor.parse(source)

      return {
        pageQuery: ast.children
          .filter(node => node.type === 'html' && /^<page-query/.test(node.value))
          .map(node => pageQueryRE.exec(node.value)[1])
          .pop()
      }
    })

    api._app.store.hooks.addCollection.tap({
      name: 'VueRemark',
      before: 'TemplatesPlugin'
    }, options => {
      if (options.typeName === this.options.typeName) {
        options.component = false
      }
    })

    api._app.store.hooks.addNode.tap({
      name: 'VueRemark',
      before: 'TransformNodeContent'
    }, options => {
      if (options.internal.typeName === this.options.typeName) {
        const parsed = this.remark.parse(options.internal.content)

        if (!parsed.title) {
          const title = parsed.content.split('\n').find(line => /^#\s/.test(line))
          if (title) parsed.title = title.match(/^#\s+(.*)/)[1]
        }

        if (!parsed.excerpt) parsed.excerpt = null

        Object.assign(options, parsed)

        options.internal.mimeType = null
        options.internal.content = null

        if (this.route) {
          const slugify = api._app.slugify
          const params = makePathParams(options, this.route, slugify)
          options.path = this.route.createPath(params)
        }
      }
    })

    api.createSchema(({ addSchemaResolvers }) => {
      const { headings } = this.remark.extendNodeType()

      addSchemaResolvers({
        [this.options.typeName]: { headings }
      })
    })
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

  async createPages ({ getCollection, createPage }) {
    const collection = getCollection(this.options.typeName)
    const nodes = collection.data()
    const length = nodes.length

    for (let i = 0; i < length; i++) {
      const node = nodes[i]

      if (this.template) {
        createPage({
          path: node.path,
          component: this.template,
          queryVariables: node,
          route: {
            meta: {
              $vueRemark: `() => import(${JSON.stringify(node.internal.origin)})`
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
    }
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
      data: {
        layout
      }
    })

    if (resourcePath) {
      file.path = resourcePath
    }

    const sfc = await this.remark.processor.process(file)

    return `${sfc}\n\n${frontMatterBlock}`
  }
}

module.exports = VueRemark
