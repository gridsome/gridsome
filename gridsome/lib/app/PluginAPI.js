const autoBind = require('auto-bind')
const { mapValues } = require('lodash')
const PluginStore = require('./PluginStore')
const { cache, nodeCache } = require('../utils/cache')

class PluginAPI {
  constructor (app, { entry, transformers }) {
    this._entry = entry
    this._app = app

    this.context = app.context

    autoBind(this)

    const pluginTransformers = transformers || mapValues(app.config.transformers, transformer => {
      return new transformer.TransformerClass(transformer.options, {
        localOptions: entry.options[transformer.name] || {},
        context: app.context,
        queue: app.queue,
        cache,
        nodeCache
      })
    })

    this.store = new PluginStore(app, entry.options.typeName, {
      transformers: pluginTransformers
    })
  }

  _on (eventName, handler) {
    this._app.on(eventName, { api: this, handler })
  }

  setClientOptions (options) {
    this._entry.clientOptions = options
  }

  loadSource (handler) {
    this._on('loadSource', handler)
  }

  createSchema (handler) {
    this._on('createSchema', handler)
  }

  chainWebpack (fn) {
    this._on('chainWebpack', fn)
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

  beforeProcessImages (fn) {
    this._on('beforeProcessImages', fn)
  }

  afterBuild (fn) {
    this._on('afterBuild', fn)
  }
}

module.exports = PluginAPI
