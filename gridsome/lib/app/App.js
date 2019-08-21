const path = require('path')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const { info } = require('../utils/log')
const isRelative = require('is-relative')
const { version } = require('../../package.json')

const {
  HookMap,
  SyncHook,
  AsyncSeriesHook,
  SyncWaterfallHook
} = require('tapable')

const {
  BOOTSTRAP_GRAPHQL,
  BOOTSTRAP_FULL
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

    this.hooks = {
      beforeBootstrap: new AsyncSeriesHook([]),
      bootstrap: new AsyncSeriesHook(['app']),
      renderQueue: new SyncWaterfallHook(['renderQueue']),
      redirects: new SyncWaterfallHook(['redirects', 'renderQueue']),
      plugin: new HookMap(() => new SyncHook(['plugin']))
    }

    autoBind(this)
  }

  async bootstrap (phase = BOOTSTRAP_FULL) {
    const timer = hirestime()

    info(`Gridsome v${version}\n`)

    await this.init()
    await this.hooks.beforeBootstrap.promise()

    this.hooks.bootstrap.intercept({
      register: hook => ({
        type: hook.type,
        name: hook.name,
        fn (app, callback) {
          if (hook.phase && hook.phase > phase) {
            return hook.type === 'promise'
              ? Promise.resolve()
              : null
          }

          const timer = hirestime()

          const done = () => {
            info(`${hook.label || hook.name} - ${timer(hirestime.S)}s`)
            if (callback) callback()
          }

          switch (hook.type) {
            case 'promise':
              return hook.fn(app).then(done)
            case 'async':
              return hook.fn(app, done)
            case 'sync':
              return (hook.fn(app), done())
            default:
              throw new Error(`Unexpected type of bootstrap hook: "${hook.type}"`)
          }
        }
      })
    })

    await this.hooks.bootstrap.promise(this)

    info(`Bootstrap finish - ${timer(hirestime.S)}s`)

    this.isBootstrapped = true

    return this
  }

  //
  // bootstrap phases
  //

  async init () {
    const Events = require('./Events')
    const Store = require('../store/Store')
    const AssetsQueue = require('./queue/AssetsQueue')
    const Codegen = require('./codegen')
    const Pages = require('../pages/pages')
    const Compiler = require('./Compiler')

    // the order of these classes are
    // important for the bootstrap process
    this.events = new Events()
    this.store = new Store(this)

    // TODO: move to schema class in #509
    this.hooks.bootstrap.tapPromise(
      {
        name: 'GridsomeSchema',
        label: 'Create GraphQL schema',
        phase: BOOTSTRAP_GRAPHQL
      },
      this.createSchema
    )

    this.assets = new AssetsQueue(this)
    this.pages = new Pages(this)
    this.codegen = new Codegen(this)
    this.compiler = new Compiler(this)

    // TODO: move to internal plugins

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

      entry.name = Plugin.name || 'AnonymousPlugin'
      entry.options = defaultsDeep(entry.options, defaults)

      const { context } = this
      const api = new PluginAPI(this, { entry })
      const instance = new Plugin(api, entry.options, { context })

      this.plugins.push({ api, entry, instance })
    })

    this.plugins.forEach(({ entry, instance }) => {
      const hookByName = this.hooks.plugin.get(entry.name)
      const hookByUse = this.hooks.plugin.get(entry.use)

      if (hookByName) hookByName.call(instance)
      if (hookByUse) hookByUse.call(instance)
    })

    // run config.chainWebpack after all plugins
    if (typeof this.config.chainWebpack === 'function') {
      this.compiler.hooks.chainWebpack.tapPromise('ChainWebpack', (chain, env) => {
        return Promise.resolve(this.config.chainWebpack(chain, env))
      })
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

  async createSchema (app) {
    const graphql = require('../graphql/graphql')
    const { mergeSchemas } = require('graphql-tools')
    const createSchema = require('../graphql/createSchema')
    const { createSchemaAPI } = require('../graphql/utils')

    const schemas = []

    const results = await app.events.dispatch('createSchema', () => {
      return createSchemaAPI({
        addSchema: schema => schemas.push(schema)
      })
    })

    // add custom schemas returned from the hook handlers
    results.forEach(schema => schema && schemas.push(schema))

    const schema = createSchema(app.store)

    app._execute = graphql.execute
    app._graphql = graphql.graphql
    app.schema = mergeSchemas({ schemas: [schema, ...schemas] })
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

  graphql (docOrQuery, variables = {}) {
    const context = this.createSchemaContext()

    const method = typeof docOrQuery === 'object' ? '_execute' : '_graphql'

    if (typeof docOrQuery === 'string') {
      // workaround until query directives
      // works in mergeSchema from graphql-tools
      docOrQuery = docOrQuery.replace(/@paginate/g, '')
    }

    return this[method](this.schema, docOrQuery, undefined, context, variables)
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
      pages: this.pages,
      config: this.config,
      assets: this.assets,
      // TODO: remove before 1.0
      queue: this.assets
    }
  }
}

module.exports = App
