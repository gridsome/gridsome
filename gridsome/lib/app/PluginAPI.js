const Source = require('./Source')
const { mapValues } = require('lodash')
const { cache, nodeCache } = require('../utils/cache')

class PluginAPI {
  constructor (app, { options }) {
    this.app = app
    this.options = options
    this.context = app.context

    this.transformers = mapValues(app.config.transformers, entry => {
      return new entry.TransformerClass(entry.options, {
        localOptions: options[entry.name] || {},
        queue: app.queue,
        nodeCache,
        cache
      })
    })

    this.store = new Source(app, this)
  }

  addClientFile (options) {}

  on (eventName, handler) {
    this.app.on(eventName, { api: this, handler })
  }

  loadSources (handler) {
    this.on('loadSources', handler)
  }

  chainWebpack (fn) {
    this.on('chainWebpack', fn)
  }
}

module.exports = PluginAPI
