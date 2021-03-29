const autoBind = require('auto-bind')
const PluginStore = require('../store/PluginStore')
const { deprecate } = require('../utils/deprecate')

class PluginAPI {
  constructor (app, { entry = {}, transformers } = {}) {
    this._entry = entry
    this._transformers = transformers
    this._app = app
    this._store = new PluginStore(app, entry.options, { transformers })

    autoBind(this)
  }

  get context () {
    return this._app.context
  }

  get config () {
    return this._app.config
  }

  get store () {
    deprecate('Avoid using api.store directly. Use the actions in api.loadSource() instead.')
    return this._store
  }

  _on (eventName, handler, options = {}) {
    this._app.plugins.on(eventName, { api: this, handler, options })
  }

  resolve (...args) {
    return this._app.resolve(...args)
  }

  setClientOptions (options) {
    this._entry.clientOptions = options
  }

  transpileDependencies (list) {
    this._app.config.transpileDependencies.push(...list)
  }

  registerComponentParser (options) {
    this._app.pages._parser.add(options)
  }

  loadSource (handler) {
    this._on('loadSource', handler)
  }

  createSchema (handler) {
    this._on('createSchema', handler)
  }

  createPages (handler) {
    this._on('createPages', handler)
  }

  createManagedPages (handler) {
    this._on('createManagedPages', handler, { once: true })
  }

  chainWebpack (fn) {
    this._app.compiler.hooks.chainWebpack.tapPromise(
      this._entry.name || 'ChainWebpack',
      (chain, context) => Promise.resolve(fn(chain, context))
    )
  }

  configureWebpack (fn) {
    this._on('configureWebpack', fn)
  }

  configureServer (fn) {
    this._on('configureServer', fn)
  }

  //
  // hooks
  //

  onInit (fn) {
    this._app.hooks.beforeBootstrap.tapPromise(this._entry.name || 'OnInit', fn)
  }

  onBootstrap (fn) {
    this._app.hooks.bootstrap.tapPromise(this._entry.name || 'OnBootstrap', fn)
  }

  onCreateNode (fn) {
    const { name = 'OnCreateNode' } = this._entry
    this._app.store.hooks.addNode.tap(name, fn)
  }

  //
  // build hooks
  //

  beforeBuild (fn) {
    this._on('beforeBuild', fn)
  }

  afterBuild (fn) {
    this._on('afterBuild', fn)
  }
}

module.exports = PluginAPI
