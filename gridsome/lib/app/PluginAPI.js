const autoBind = require('auto-bind')
const PluginStore = require('./PluginStore')

class PluginAPI {
  constructor (app, { entry, transformers }) {
    this._entry = entry
    this._app = app

    this.config = app.config
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
            app.createRoutes()
            app.store.setUpdateTime()
            app.codegen.generate('routes.js')
          }
        }, 20)
      }

      this.store.on('removePage', regenerateRoutes)
      this.store.on('addPage', regenerateRoutes)

      this.store.on('change', (node, oldNode = node) => {
        if (!app.isBootstrapped) return

        app.store.setUpdateTime()

        if (
          (node && node.withPath && node === oldNode) ||
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

        if (paginate !== oldPaginate) {
          return regenerateRoutes()
        }

        // send query to front-end for re-fetch
        app.broadcast({
          type: 'updateQuery',
          query: page.pageQuery.query,
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

  transpileDependencies (list) {
    this._app.config.transpileDependencies.push(...list)
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
