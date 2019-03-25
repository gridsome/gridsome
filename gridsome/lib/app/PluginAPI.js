const autoBind = require('auto-bind')
const PluginStore = require('./PluginStore')

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
    this._app.config.componentParsers.push(options)
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

function createPagesAPI (api) {
  return {
    store: api.store,
    graphql: api._app.graphql,
    createPage (options) {
      return api._app.pages.createPage(options)
    },
    updatePage (options) {
      return api._app.pages.updatePage(options)
    },
    removePage (query) {
      return api._app.pages.removePage(query)
    },
    findPage (query) {
      return api._app.pages.findPage(query)
    },
    findPages (query) {
      return api._app.pages.findPages(query)
    }
  }
}

module.exports = PluginAPI
