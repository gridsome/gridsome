const PluginAPI = require('./PluginAPI')
const { hashString } = require('../utils')
const { defaultsDeep } = require('lodash')

const {
  BOOTSTRAP_SOURCES,
  BOOTSTRAP_GRAPHQL,
  BOOTSTRAP_PAGES
} = require('../utils/constants')

const {
  createSchemaActions,
  createPagesActions,
  createManagedPagesActions
} = require('./actions')

class Plugins {
  constructor(app) {
    this._app = app
    this._plugins = []
    this._listeners = []

    app.hooks.bootstrap.tapPromise(
      { name: 'loadSource', label: 'Load sources', phase: BOOTSTRAP_SOURCES },
      () => this.loadSources()
    )

    app.hooks.bootstrap.tapPromise(
      { name: 'createSchema', label: 'Create GraphQL schema', phase: BOOTSTRAP_GRAPHQL },
      () => this.createSchema()
    )

    app.hooks.bootstrap.tapPromise(
      { name: 'createPages', label: 'Create pages and templates', phase: BOOTSTRAP_PAGES },
      () => this.createPages()
    )
  }

  initialize() {
    const { context } = this._app

    for (const entry of this._app.config.plugins) {
      const { serverEntry } = entry.entries
      const Plugin = typeof serverEntry === 'string'
        ? require(entry.entries.serverEntry)
        : typeof serverEntry === 'function'
          ? serverEntry
          : null

      if (typeof Plugin !== 'function') continue

      const defaults = typeof Plugin.defaultOptions === 'function'
        ? Plugin.defaultOptions()
        : {}

      entry.name = Plugin.name || 'AnonymousPlugin'
      entry.options = defaultsDeep(entry.options, defaults)

      const api = new PluginAPI(this._app, { entry })
      const instance = Plugin.prototype
        ? new Plugin(api, entry.options, { context })
        : Plugin(api, entry.options, { context })

      this._plugins.push({ api, entry, instance })
    }

    return this._plugins
  }

  on(eventName, { api, handler, options = {}}) {
    if (!Array.isArray(this._listeners[eventName])) {
      this._listeners[eventName] = []
    }

    this._listeners[eventName].push({ api, handler, options, done: false })
  }

  async loadSources() {
    return this.run('loadSource', api => {
      return createSchemaActions(api, this._app)
    })
  }

  async createSchema() {
    const results = await this.run('createSchema', api => {
      return createSchemaActions(api, this._app)
    })

    // add custom schemas returned from the hook handlers
    results.forEach(schema =>
      schema && this._app.schema._schemas.push(schema)
    )

    this._app.schema.buildSchema()
  }

  async configureServer(server) {
    return this.run('configureServer', null, server)
  }

  async createPages() {
    const { isBootstrapped, pages } = this._app
    const now = Date.now() + process.hrtime()[1]
    const digest = hashString(now.toString())

    if (isBootstrapped) {
      pages.disableIndices()
    }

    await this.run('createPages', api => {
      return createPagesActions(api, this._app, { digest })
    })

    pages.enableIndices()

    await this.run('createManagedPages', api => {
      return createManagedPagesActions(api, this._app, { digest })
    })

    // remove unmanaged pages created
    // in earlier digest cycles
    const query = {
      'internal.digest': { $ne: digest },
      'internal.isManaged': { $eq: false }
    }

    pages._routes.findAndRemove(query)
    pages._pages.findAndRemove(query)
  }

  async run(eventName, cb, ...args) {
    if (!this._listeners[eventName]) return []

    const results = []

    for (const entry of this._listeners[eventName]) {
      if (entry.options.once && entry.done) continue

      const { api, handler } = entry
      const result = typeof cb === 'function'
        ? await handler(cb(api))
        : await handler(...args, api)

      results.push(result)
      entry.done = true
    }

    return results
  }
}

module.exports = Plugins
