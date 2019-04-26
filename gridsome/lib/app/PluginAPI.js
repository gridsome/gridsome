const autoBind = require('auto-bind')
const PluginStore = require('../store/PluginStore')
const { createPagesAPI } = require('../pages/utils')

class PluginAPI {
  constructor (app, { entry, transformers }) {
    this._entry = entry
    this._app = app

    this.config = app.config
    this.context = app.context

    this.store = new PluginStore(app, entry.options, { transformers })
    this.pages = createPagesAPI(this)

    autoBind(this)
  }

  _on (eventName, handler) {
    this._app.on(eventName, { api: this, handler })
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
}

module.exports = PluginAPI
