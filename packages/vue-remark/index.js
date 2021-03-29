const path = require('path')
const pathToRegexp = require('path-to-regexp')
const Filesystem = require('@gridsome/source-filesystem')
const RemarkTransformer = require('@gridsome/transformer-remark')
const { omit, trimEnd, kebabCase } = require('lodash')
const { GraphQLList, GraphQLBoolean } = require('gridsome/graphql')

const toSFC = require('./lib/toSfc')
const sfcSyntax = require('./lib/sfcSyntax')
const toVueRemarkAst = require('./lib/toVueRemarkAst')
const remarkFilePlugin = require('./lib/plugins/file')
const remarkImagePlugin = require('./lib/plugins/image')

const {
  HeadingType,
  HeadingLevels
} = require('./lib/types/HeadingType')

const {
  createFile,
  makePathParams,
  normalizeLayout,
  createCacheIdentifier
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

const createCustomBlockRule = (config, type) => {
  const re = new RegExp(`blockType=(${type})`)

  config.module.rule(type)
    .resourceQuery(re)
    .use('babel-loader')
    .loader(require.resolve('babel-loader'))
    .options({
      presets: [
        require.resolve('@babel/preset-env')
      ]
    })
}

const genChunkName = (context, component) => {
  const chunkName = path.relative(context, component)
    .split('/')
    .filter(s => s !== '..')
    .map(s => kebabCase(s))
    .join('--')

  return `vue-remark--${chunkName}`
}

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
      refs: {},
      ignore: []
    }
  }

  constructor (api, options) {
    if (!options.baseDir) {
      throw new Error(`@gridsome/vue-remark requires the 'baseDir' option.`)
    }

    if (!options.typeName) {
      throw new Error(`@gridsome/vue-remark requires the 'typeName' option.`)
    }

    if (api.config.templates[options.typeName]) {
      throw new Error(
        `@gridsome/vue-remark does not work with a template. ` +
        `Remove "${options.typeName}" from the global templates config ` +
        `and use the "template" option for the plugin instead.`
      )
    }

    this.api = api
    this.options = options
    this.context = options.baseDir ? api.resolve(options.baseDir) : api.context

    api.setClientOptions({})

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

    const paths = [
      '**/*.md',
      ...options.ignore.map((path) => `!${path}`)
    ]

    this.filesystem = new Filesystem(api, {
      path: paths,
      typeName: options.typeName,
      baseDir: options.baseDir,
      pathPrefix: options.pathPrefix,
      index: options.index,
      refs: options.refs
    })

    const remarkOptions = options.remark || {}

    this.remark = new RemarkTransformer({}, {
      assets: api._app.assets,
      localOptions: {
        ...remarkOptions,
        processFiles: false,
        processImages: false,
        stringifier: toSFC,
        plugins: [
          sfcSyntax,
          toVueRemarkAst,
          [remarkFilePlugin, {
            processFiles: remarkOptions.processFiles
          }],
          [remarkImagePlugin, {
            processImages: remarkOptions.processImages,
            blur: remarkOptions.imageBlurRatio,
            quality: remarkOptions.imageQuality,
            background: remarkOptions.imageBackground,
            immediate: remarkOptions.lazyLoadImages === false ? true : undefined
          }],
          ...options.plugins
        ]
      }
    })

    api.transpileDependencies([path.resolve(__dirname, 'src')])
    api.chainWebpack(config => this.chainWebpack(config))
    api.createPages(actions => this.createPages(actions))

    if (api._app.compiler.hooks.cacheIdentifier) {
      api._app.compiler.hooks.cacheIdentifier.tap('VueRemark', id => {
        id[`vue-remark-${api._entry.uid}`] = createCacheIdentifier(
          api.context,
          this.options.remark,
          this.remark.processor.attachers
        )
      })
    }

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

        Object.assign(options, omit(parsed, ['layout']))

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
      if (options.remark.autolinkHeadings === false) {
        return
      }

      const { headings } = this.remark.extendNodeType()

      addSchemaResolvers({
        [this.options.typeName]: {
          headings: {
            ...headings,
            type: new GraphQLList(HeadingType),
            args: {
              ...headings.args,
              depth: {
                type: HeadingLevels
              },
              stripTags: {
                type: GraphQLBoolean, defaultValue: true
              }
            }
          }
        }
      })
    })
  }

  chainWebpack (config) {
    const vueLoader = config.module.rule('vue').use('vue-loader')
    const includePaths = this.options.includePaths.map(p => this.api.resolve(p))

    createCustomBlockRule(config, 'vue-remark-import')
    createCustomBlockRule(config, 'vue-remark-frontmatter')

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
      .loader(require.resolve('vue-loader'))
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
        const chunkName = genChunkName(
          this.api.context,
          node.internal.origin
        )

        createPage({
          path: node.path,
          component: this.template,
          queryVariables: node,
          route: {
            meta: {
              $vueRemark: `() => import(/* webpackChunkName: "${chunkName}" */ ${JSON.stringify(node.internal.origin)})`
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

  async parse (source, options = {}) {
    const { content, ...data } = this.remark.parse(source.trim())
    const defaultLayout = require.resolve('./src/VueRemarkRoot.js')
    const layout = normalizeLayout(data.layout || defaultLayout)

    if (!data.layout && !path.isAbsolute(layout.component)) {
      layout.component = path.resolve(this.api.context, layout.component)
    }

    if (!data.excerpt) data.excerpt = null

    const file = createFile({
      contents: content,
      data: {
        data,
        layout,
        ...options
      }
    })

    if (options.resourcePath) {
      file.path = options.resourcePath
    }

    const sfc = await this.remark.processor.process(file)

    return sfc.contents
  }
}

module.exports = VueRemark
