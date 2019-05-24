const autoBind = require('auto-bind')
const PluginStore = require('../store/PluginStore')

class PluginAPI {
  constructor (app, { entry, transformers }) {
    this._entry = entry
    this._app = app

    this.config = app.config
    this.context = app.context

    this.store = new PluginStore(app, entry.options, { transformers })

    autoBind(this)
  }

  _on (eventName, handler, options = {}) {
    this._app.events.on(eventName, { api: this, handler, options })
  }

  resolve (value) {
    return this._app.resolve(value)
  }

  setClientOptions (options) {
    this._entry.clientOptions = options
  }

  transpileDependencies (list) {
    this._app.config.transpileDependencies.push(...list)
  }

  registerComponentParser (options) {
    this._app.parser.add(options)
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
    this._on('chainWebpack', fn)
  }

  configureWebpack (fn) {
    this._on('configureWebpack', fn)
  }

  configureServer (fn) {
    this._on('configureServer', fn)
  }

  //
  // build hooks
  //

  beforeBuild (fn) {
    this._on('beforeBuild', fn)
  }

  beforeRenderQueries (fn) {
    this._on('beforeRenderQueries', fn)
  }

  beforeRenderHTML (fn) {
    this._on('beforeRenderHTML', fn)
  }

  beforeProcessAssets (fn) {
    this._on('beforeProcessAssets', fn)
  }

  afterBuild (fn) {
    this._on('afterBuild', fn)
  }

  //
  // experimental
  //

  ___onCreateContentType (fn) {
    const id = this._entry.use || 'onCreateContentType'

    this._app._hooks.contentType.tap(id, (options, app) => {
      return fn(options, app) || options
    })
  }

  ___onCreateNode (fn) {
    const id = this._entry.use || 'onCreateNode'

    this._app._hooks.node.tap(id, (options, contentType, app) => {
      return fn(options, contentType, app) || options
    })
  }

  ___onCreatePage (fn) {
    const id = this._entry.use || 'onCreatePage'

    this._app._hooks.page.tap(id, (options, pages, app) => {
      return fn(options, pages, app) || options
    })
  }
}

module.exports = PluginAPI
