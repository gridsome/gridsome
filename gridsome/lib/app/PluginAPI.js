const autoBind = require('auto-bind')
const { mapValues } = require('lodash')
const PluginStore = require('./PluginStore')
const { cache, nodeCache } = require('../utils/cache')

class PluginAPI {
  constructor (app, { entry, transformers }) {
    this._entry = entry
    this._app = app

    this.context = app.context
    this.store = new PluginStore(app, entry.options, { transformers })

    autoBind(this)

    if (process.env.NODE_ENV === 'development') {
      let regenerateTimeout = null

      // use timeout as a workaround for when files are renamed,
      // which triggers both addPage and removePage events...
      const regenerateRoutes = () => {
        clearTimeout(regenerateTimeout)
        regenerateTimeout = setTimeout(() => {
          if (app.isBootstrapped) {
            app.generator.generate('routes.js')
          }
        }, 20)
      }

      this.store.on('removePage', regenerateRoutes)
      this.store.on('addPage', regenerateRoutes)

      this.store.on('change', (node, oldNode = node) => {
        if (!app.isBootstrapped) return

        if (
          (node && node.withPath && node.path !== oldNode.path) ||
          (!node && oldNode.withPath)
        ) {
          return regenerateRoutes()
        }

        app.broadcast({
          type: 'updateAllQueries'
        })
      })

      this.store.on('updatePage', async (page, oldPage) => {
        if (!app.isBootstrapped) return

        const { pageQuery: { paginate: oldPaginate }} = oldPage
        const { pageQuery: { paginate }} = page

        // regenerate route.js whenever paging options changes
        if (paginate.collection !== oldPaginate.collection) {
          return regenerateRoutes()
        }

        // send query to front-end for re-fetch
        app.broadcast({
          type: 'updateQuery',
          query: page.pageQuery.content,
          file: page.internal.origin
        })
      })
    }
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
