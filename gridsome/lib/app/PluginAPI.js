const { mapValues } = require('lodash')
const PluginStore = require('./PluginStore')
const { cache, nodeCache } = require('../utils/cache')

class PluginAPI {
  constructor (app, { options, transformers }) {
    this.app = app
    this.options = options
    this.context = app.context

    this.transformers = transformers || mapValues(app.config.transformers, entry => {
      return new entry.TransformerClass(entry.options, {
        localOptions: options[entry.name] || {},
        queue: app.queue,
        nodeCache,
        cache
      })
    })

    this.store = new PluginStore(app, this)
  }

  addClientFile (options) {}

  on (eventName, handler) {
    this.app.on(eventName, { api: this, handler })
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
