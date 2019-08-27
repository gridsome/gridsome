const path = require('path')
const fs = require('fs-extra')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const { info } = require('../utils/log')
const isRelative = require('is-relative')
const { version } = require('../../package.json')

const {
  SyncWaterfallHook,
  AsyncSeriesWaterfallHook
} = require('tapable')

const {
  BOOTSTRAP_CONFIG,
  BOOTSTRAP_SOURCES,
  BOOTSTRAP_GRAPHQL,
  BOOTSTRAP_PAGES,
  BOOTSTRAP_CODE
} = require('../utils/constants')

class App {
  constructor (context, options) {
    process.GRIDSOME = this

    this.clients = {}
    this.plugins = []
    this.context = context
    this.config = require('./loadConfig')(context, options)
    this.isInitialized = false
    this.isBootstrapped = false

    this._hooks = {
      createRenderQueue: new AsyncSeriesWaterfallHook(['renderQueue', 'app']),
      contentType: new SyncWaterfallHook(['options', 'app']),
      node: new SyncWaterfallHook(['options', 'contentType', 'app']),
      page: new SyncWaterfallHook(['options', 'pages', 'app'])
    }

    this._hooks.createRenderQueue.tap('Gridsome', require('./build/createRenderQueue'))
    this._hooks.createRenderQueue.tap('Gridsome', require('./build/createHTMLPaths'))
    this._hooks.createRenderQueue.tapPromise('Gridsome', require('./build/executeQueries'))

    autoBind(this)
  }

  async bootstrap (phase) {
    const bootstrapTime = hirestime()

    const phases = [
      { phase: BOOTSTRAP_CONFIG, title: 'Initialize', run: this.init },
      { phase: BOOTSTRAP_SOURCES, title: 'Load sources', run: this.loadSources },
      { phase: BOOTSTRAP_GRAPHQL, title: 'Create GraphQL schema', run: this.createSchema },
      { phase: BOOTSTRAP_PAGES, title: 'Create pages and templates', run: this.createPages },
      { phase: BOOTSTRAP_CODE, title: 'Generate code', run: this.generateCode }
    ]

    info(`Gridsome v${version}\n`)

    for (const current of phases) {
      const timer = hirestime()
      await current.run(this)

      info(`${current.title} - ${timer(hirestime.S)}s`)

      if (current.phase === phase) break
    }

    info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    this.isBootstrapped = true

    return this
  }

  //
  // bootstrap phases
  //

  init () {
    const Events = require('./Events')
    const Store = require('../store/Store')
    const Schema = require('./Schema')
    const AssetsQueue = require('./queue/AssetsQueue')
    const Codegen = require('./codegen')
    const Pages = require('../pages/pages')

    this.events = new Events()
    this.store = new Store(this)
    this.schema = new Schema(this)
    this.assets = new AssetsQueue(this)
    this.codegen = new Codegen(this)
    this.pages = new Pages(this)

    // TODO: remove before 1.0
    this.queue = this.assets

    const { defaultsDeep } = require('lodash')
    const PluginAPI = require('./PluginAPI')

    info(`Initializing plugins...`)

    this.config.plugins.forEach(entry => {
      const { serverEntry } = entry.entries
      const Plugin = typeof serverEntry === 'string'
        ? require(entry.entries.serverEntry)
        : typeof serverEntry === 'function'
          ? serverEntry
          : null

      if (typeof Plugin !== 'function') return
      if (!Plugin.prototype) return

      const defaults = typeof Plugin.defaultOptions === 'function'
        ? Plugin.defaultOptions()
        : {}

      entry.options = defaultsDeep(entry.options, defaults)

      const { context } = this
      const api = new PluginAPI(this, { entry })
      const instance = new Plugin(api, entry.options, { context })

      this.plugins.push({ api, entry, instance })
    })

    // run config.chainWebpack after all plugins
    if (typeof this.config.chainWebpack === 'function') {
      this.events.on('chainWebpack', { handler: this.config.chainWebpack })
    }

    // run config.configureWebpack after all plugins
    if (this.config.configureWebpack) {
      this.events.on('configureWebpack', { handler: this.config.configureWebpack })
    }

    // run config.configureServer after all plugins
    if (typeof this.config.configureServer === 'function') {
      this.events.on('configureServer', { handler: this.config.configureServer })
    }

    this.isInitialized = true

    return this
  }

  async loadSources () {
    const { createSchemaActions } = require('./actions')

    await this.events.dispatch('loadSource', api => {
      return createSchemaActions(api, this)
    })
  }

  async createSchema () {
    const { createSchemaActions } = require('./actions')

    const results = await this.events.dispatch('createSchema', api => {
      return createSchemaActions(api, this)
    })

    // add custom schemas returned from the hook handlers
    results.forEach(schema =>
      schema && this.schema._schemas.push(schema)
    )

    this.schema.buildSchema()
  }

  async createPages () {
    const {
      createPagesActions,
      createManagedPagesActions
    } = require('./actions')

    const { hashString } = require('../utils')
    const digest = hashString(Date.now().toString())

    this.pages._cached.clear()
    this.pages._collection.adaptiveBinaryIndices = false

    await this.events.dispatch('createPages', api => {
      return createPagesActions(api, this, { digest })
    })

    await this.events.dispatch('createManagedPages', api => {
      return createManagedPagesActions(api, this, { digest })
    })

    this.pages._collection.adaptiveBinaryIndices = true
    this.pages._collection.ensureAllIndexes(true)

    // ensure a /404 page exists
    if (!this.pages.findPage({ path: '/404' })) {
      this.pages.createPage({
        path: '/404',
        component: path.join(this.config.appPath, 'pages', '404.vue')
      }, { digest, isManaged: true })
    }

    // remove unmanaged pages created
    // in earlier digest cycles
    this.pages.findAndRemovePages({
      'internal.digest': { $ne: digest },
      'internal.isManaged': { $eq: false }
    })
  }

  async generateCode () {
    await this.codegen.generate()
  }

  //
  // helpers
  //

  resolve (...args) {
    const value = path.join(...args)

    return isRelative(value)
      ? path.join(this.context, value)
      : value
  }

  async resolveChainableWebpackConfig (isServer = false) {
    const createClientConfig = require('../webpack/createClientConfig')
    const createServerConfig = require('../webpack/createServerConfig')
    const createChainableConfig = isServer ? createServerConfig : createClientConfig
    const isProd = process.env.NODE_ENV === 'production'
    const args = { context: this.context, isServer, isClient: !isServer, isProd, isDev: !isProd }
    const chain = await createChainableConfig(this, args)

    await this.events.dispatch('chainWebpack', null, chain, args)

    return chain
  }

  async resolveWebpackConfig (isServer = false, chain = null) {
    const isProd = process.env.NODE_ENV === 'production'
    const args = { context: this.context, isServer, isClient: !isServer, isProd, isDev: !isProd }
    const resolvedChain = chain || await this.resolveChainableWebpackConfig(isServer)
    const configureWebpack = (this.events._events.configureWebpack || []).slice()
    const configFilePath = this.resolve('webpack.config.js')
    const merge = require('webpack-merge')

    if (fs.existsSync(configFilePath)) {
      configureWebpack.push(require(configFilePath))
    }

    const config = await configureWebpack.reduce(async (acc, { handler }) => {
      const config = await Promise.resolve(acc)

      if (typeof handler === 'function') {
        return handler(config, args) || config
      }

      if (typeof handler === 'object') {
        return merge(config, handler)
      }

      return config
    }, Promise.resolve(resolvedChain.toConfig()))

    if (config.output.publicPath !== this.config.publicPath) {
      throw new Error(
        `Do not modify webpack output.publicPath directly. ` +
        `Use the "pathPrefix" option in gridsome.config.js instead.`
      )
    }

    return config
  }

  graphql (docOrQuery, variables = {}) {
    return this.schema.runQuery(docOrQuery, variables)
  }

  broadcast (message, hotReload = true) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }

    return hotReload
      ? this.codegen.generate('now.js')
      : undefined
  }
}

module.exports = App
