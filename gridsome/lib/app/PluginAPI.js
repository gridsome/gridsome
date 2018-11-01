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

  on (eventName, handler) {
    this._app.on(eventName, { api: this, handler })
  }

  setClientOptions (options) {
    this._entry.clientOptions = options
  }

  loadSource (handler) {
    this.on('loadSource', handler)
  }

  createSchema (handler) {
    this.on('createSchema', handler)
  }

  chainWebpack (fn) {
    this.on('chainWebpack', fn)
  }
}

module.exports = PluginAPI
