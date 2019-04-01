const path = require('path')
const fs = require('fs-extra')
const isUrl = require('is-url')
const Codegen = require('./codegen')
const autoBind = require('auto-bind')
const merge = require('webpack-merge')
const hirestime = require('hirestime')
const Pages = require('../pages/pages')
const BaseStore = require('./BaseStore')
const PluginAPI = require('./PluginAPI')
const ComponentParser = require('./ComponentParser')
const { execute, graphql } = require('graphql')
const AssetsQueue = require('./queue/AssetsQueue')
const loadConfig = require('./loadConfig')
const { defaultsDeep } = require('lodash')
const { version } = require('../../package.json')
const { parseUrl, resolvePath } = require('../utils')
const { info } = require('../utils/log')

const {
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

    this.events = {}
    this.clients = {}
    this.plugins = []
    this.context = context
    this.config = loadConfig(context, options)
    this.isInitialized = false
    this.isBootstrapped = false

    this.hooks = {
      createRenderQueue: new AsyncSeriesWaterfallHook(['renderQueue', 'app'])
    }

    this.hooks.createRenderQueue.tap('Gridsome', require('../pages/createRenderQueue'))
    this.hooks.createRenderQueue.tap('Gridsome', require('../pages/createHTMLPaths'))
    this.hooks.createRenderQueue.tapPromise('Gridsome', require('../graphql/executeQueries'))

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
    this.store = new BaseStore(this)
    this.queue = new AssetsQueue(this)
    this.codegen = new Codegen(this)
    this.parser = new ComponentParser(this)
    this.pages = new Pages(this)

    this.config.plugins.map(entry => {
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
      this.on('chainWebpack', { handler: this.config.chainWebpack })
    }

    // run config.configureWebpack after all plugins
    if (this.config.configureWebpack) {
      this.on('configureWebpack', { handler: this.config.configureWebpack })
    }

    // run config.configureServer after all plugins
    if (typeof this.config.configureServer === 'function') {
      this.on('configureServer', { handler: this.config.configureServer })
    }

    this.isInitialized = true

    return this
  }

  async loadSources () {
    await this.dispatch('loadSource', api => api.store)
  }

  async createSchema () {
    const graphql = require('../graphql/graphql')
    const { mergeSchemas } = require('graphql-tools')
    const createSchema = require('../graphql/createSchema')

    const schema = createSchema(this.store)
    const schemas = [schema]

    const api = { ...graphql, addSchema: schema => schemas.push(schema) }
    const results = await this.dispatch('createSchema', () => api)

    // add custom schemas returned from the hook handlers
    results.forEach(schema => schema && schemas.push(schema))

    this.schema = mergeSchemas({ schemas })
  }

  async createPages () {
    const { createPagesAPI } = require('../pages/utils')
    await this.dispatch('createPages', api => createPagesAPI(api))

    // ensure a /404 page exists
    if (!this.pages.findPage({ path: '/404' })) {
      this.pages.createPage({
        path: '/404',
        component: path.join(this.config.appPath, 'pages', '404.vue')
      })
    }

    if (process.env.NODE_ENV === 'development') {
      this.pages.on('create', () => this.codegen.generate('routes.js'))
      this.pages.on('remove', () => this.codegen.generate('routes.js'))

      this.pages.on('update', (page, oldPage) => {
        const { path: oldPath, query: oldQuery } = oldPage
        const { path, query } = page

        if (
          (path !== oldPath && !page.internal.isDynamic) ||
          // pagination was added or removed in page-query
          (query.paginate && !oldQuery.paginate) ||
          (!query.paginate && oldQuery.paginate) ||
          // page-query was created or removed
          (query.document && !oldQuery.document) ||
          (!query.document && oldQuery.document)
        ) {
          return this.codegen.generate('routes.js')
        }

        this.broadcast({ type: 'fetch' })
      })
    }
  }

  async generateCode () {
    await this.codegen.generate()
  }

  //
  // Events
  //

  on (eventName, { api, handler }) {
    const { events } = this

    if (!Array.isArray(events[eventName])) {
      events[eventName] = []
    }

    events[eventName].push({ api, handler })
  }

  dispatch (eventName, cb, ...args) {
    if (!this.events[eventName]) return []
    return Promise.all(this.events[eventName].map(({ api, handler }) => {
      return typeof cb === 'function' ? handler(cb(api)) : handler(...args, api)
    }))
  }

  dispatchSync (eventName, cb, ...args) {
    if (!this.events[eventName]) return []
    return this.events[eventName].map(({ api, handler }) => {
      return typeof cb === 'function' ? handler(cb(api)) : handler(...args, api)
    })
  }

  //
  // helpers
  //

  resolve (p) {
    return path.resolve(this.context, p)
  }

  async resolveChainableWebpackConfig (isServer = false) {
    const createClientConfig = require('../webpack/createClientConfig')
    const createServerConfig = require('../webpack/createServerConfig')
    const createChainableConfig = isServer ? createServerConfig : createClientConfig
    const isProd = process.env.NODE_ENV === 'production'
    const args = { context: this.context, isServer, isClient: !isServer, isProd, isDev: !isProd }
    const chain = await createChainableConfig(this, args)

    await this.dispatch('chainWebpack', null, chain, args)

    return chain
  }

  async resolveWebpackConfig (isServer = false, chain = null) {
    const isProd = process.env.NODE_ENV === 'production'
    const args = { context: this.context, isServer, isClient: !isServer, isProd, isDev: !isProd }
    const resolvedChain = chain || await this.resolveChainableWebpackConfig(isServer)
    const configureWebpack = (this.events.configureWebpack || []).slice()
    const configFilePath = this.resolve('webpack.config.js')

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

    if (config.output.publicPath !== this.config.pathPrefix) {
      throw new Error(
        `Do not modify webpack output.publicPath directly. ` +
        `Use the "pathPrefix" option in gridsome.config.js instead.`
      )
    }

    return config
  }

  resolveFilePath (fromPath, toPath, isAbsolute) {
    let rootDir = null

    if (typeof isAbsolute === 'string') {
      rootDir = isUrl(isAbsolute)
        ? parseUrl(isAbsolute).fullUrl
        : isAbsolute
    }

    if (isAbsolute === true) {
      rootDir = isUrl(fromPath)
        ? parseUrl(fromPath).baseUrl
        : this.context
    }

    return resolvePath(fromPath, toPath, rootDir)
  }

  graphql (docOrQuery, variables = {}) {
    const context = this.createSchemaContext()

    const func = typeof docOrQuery === 'object' ? execute : graphql

    if (typeof docOrQuery === 'string') {
      // workaround until query directives
      // works in mergeSchema from graphql-tools
      docOrQuery = docOrQuery.replace(/@paginate/g, '')
    }

    return func(this.schema, docOrQuery, undefined, context, variables)
  }

  broadcast (message, hotReload = true) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }

    return hotReload
      ? this.codegen.generate('now.js')
      : undefined
  }

  createSchemaContext () {
    return {
      store: this.store,
      config: this.config,
      queue: this.queue
    }
  }
}

module.exports = App
