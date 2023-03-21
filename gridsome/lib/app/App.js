const path = require('path')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const { info } = require('../utils/log')
const isRelative = require('is-relative')
const { version } = require('../../package.json')
const { deprecate } = require('../utils/deprecate')

const {
  SyncHook,
  AsyncSeriesHook,
  SyncWaterfallHook
} = require('tapable')

const { BOOTSTRAP_FULL } = require('../utils/constants')

class App {
  constructor (context, options) {
    process.GRIDSOME = this

    this.clients = {}
    this.context = context
    this.config = require('./loadConfig')(context, options)
    this.isInitialized = false
    this.isBootstrapped = false

    this.hooks = {
      beforeBootstrap: new AsyncSeriesHook([]),
      bootstrap: new AsyncSeriesHook(['app']),
      renderQueue: new SyncWaterfallHook(['renderQueue']),
      redirects: new SyncWaterfallHook(['redirects', 'renderQueue']),
      server: new SyncHook(['server'])
    }

    if (this.config.permalinks.slugify) {
      this._slugify = this.config.permalinks.slugify.use
    } else {
      this._slugify = v => v
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

    await this.hooks.bootstrap.promise()

    info(`Bootstrap finish - ${timer(hirestime.S)}s`)

    this.isBootstrapped = true

    return this
  }

  //
  // bootstrap phases
  //

  async init () {
    const Plugins = require('./Plugins')
    const Store = require('../store/Store')
    const Schema = require('./Schema')
    const AssetsQueue = require('./queue/AssetsQueue')
    const Codegen = require('./codegen')
    const Pages = require('../pages/pages')
    const Compiler = require('./Compiler')

    this.plugins = new Plugins(this)
    this.store = new Store(this)
    this.schema = new Schema(this)
    this.assets = new AssetsQueue(this)
    this.pages = new Pages(this)
    this.codegen = new Codegen(this)
    this.compiler = new Compiler(this)

    // TODO: remove before 1.0
    this.queue = this.assets
    deprecate.property(this, 'queue', 'The property app.queue is deprecated. Use app.assets instead.')

    info(`Initializing plugins...`)

    this.plugins.initialize()

    // run config.chainWebpack after all plugins
    if (typeof this.config.chainWebpack === 'function') {
      this.compiler.hooks.chainWebpack.tapPromise('ChainWebpack', (chain, env) => {
        return Promise.resolve(this.config.chainWebpack(chain, env))
      })
    }

    // run config.configureWebpack after all plugins
    if (this.config.configureWebpack) {
      this.plugins.on('configureWebpack', { handler: this.config.configureWebpack })
    }

    // run config.configureServer after all plugins
    if (typeof this.config.configureServer === 'function') {
      this.plugins.on('configureServer', { handler: this.config.configureServer })
    }

    this.isInitialized = true

    return this
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

  slugify (value = '') {
    return this._slugify(value, this.config.permalinks.slugify.options)
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
