const path = require('path')
const Router = require('vue-router')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const BaseStore = require('./BaseStore')
const PluginAPI = require('./PluginAPI')
const CodeGenerator = require('./CodeGenerator')
const ImageProcessQueue = require('./ImageProcessQueue')
const createSchema = require('../graphql/createSchema')
const loadConfig = require('./loadConfig')
const { defaultsDeep } = require('lodash')
const createRoutes = require('./createRoutes')
const { execute, graphql } = require('../graphql/graphql')
const { version } = require('../../package.json')
const { resolvePath } = require('../utils')

class App {
  constructor (context, options) {
    process.GRIDSOME = this

    this.events = []
    this.clients = {}
    this.plugins = []
    this.context = context
    this.config = loadConfig(context, options)
    this.isInitialized = false
    this.isBootstrapped = false

    autoBind(this)
  }

  async bootstrap (phase) {
    const bootstrapTime = hirestime()

    const phases = [
      { title: 'Initialize', run: this.init },
      { title: 'Load sources', run: this.loadSources },
      { title: 'Create GraphQL schema', run: this.createSchema },
      { title: 'Generate code', run: this.generateFiles }
    ]

    console.log(`Gridsome v${version}`)
    console.log()

    for (const current of phases) {
      if (phases.indexOf(current) <= phase) {
        const timer = hirestime()
        await current.run(this)

        console.info(`${current.title} - ${timer(hirestime.S)}s`)
      }
    }

    console.info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    this.isBootstrapped = true

    return this
  }

  //
  // bootstrap phases
  //

  init () {
    this.store = new BaseStore(this)
    this.queue = new ImageProcessQueue(this)
    this.generator = new CodeGenerator(this)

    this.config.plugins.map(entry => {
      const Plugin = entry.entries.serverEntry
        ? require(entry.entries.serverEntry)
        : null

      if (typeof Plugin !== 'function') return
      if (!Plugin.prototype) return

      const defaults = typeof Plugin.defaultOptions === 'function'
        ? Plugin.defaultOptions()
        : {}

      entry.options = defaultsDeep(entry.options, defaults)

      const { context } = this
      const api = new PluginAPI(this, { entry })
      const instance = new Plugin(api, entry.options, { context })

      this.plugins.push({ api, entry, instance })
    })

    this.isInitialized = true

    return this
  }

  async loadSources () {
    return this.dispatch('loadSource', api => api.store)
  }

  async createSchema () {
    const graphql = require('../graphql/graphql')

    this.schema = createSchema(this.store, {
      schemas: await this.dispatch('createSchema', () => graphql)
    })
  }

  generateFiles () {
    this.routerData = createRoutes(this.store)

    this.router = new Router({
      base: '/',
      mode: 'history',
      fallback: false,
      routes: this.routerData.pages.map(page => ({
        path: page.route || page.path,
        component: () => page
      }))
    })

    return this.generator.generate()
  }

  //
  // Events
  //

  on (eventName, { api, handler }) {
    const { events } = this

    if (!Array.isArray(events[eventName])) {
      events[eventName] = []
    }

    events[eventName].push({ api, handler })
  }

  dispatch (eventName, cb, ...args) {
    if (!this.events[eventName]) return
    return Promise.all(this.events[eventName].map(({ api, handler }) => {
      return typeof cb === 'function' ? handler(cb(api)) : handler(...args, api)
    }))
  }

  dispatchSync (eventName, cb, ...args) {
    if (!this.events[eventName]) return
    return this.events[eventName].map(({ api, handler }) => {
      return typeof cb === 'function' ? handler(cb(api)) : handler(...args, api)
    })
  }

  //
  // helpers
  //

  resolve (p) {
    return path.resolve(this.context, p)
  }

  resolveFilePath (fromPath, toPath, isAbsolute) {
    return resolvePath(fromPath, toPath, isAbsolute, {
      context: this.context
    })
  }

  graphql (docOrQuery, variables = {}) {
    const context = { store: this.store, config: this.config }
    const func = typeof docOrQuery === 'object' ? execute : graphql

    if (typeof docOrQuery === 'string') {
      // workaround until query directives
      // works in mergeSchema from graphql-tools
      docOrQuery = docOrQuery.replace(/@paginate/g, '')
    }

    return func(this.schema, docOrQuery, undefined, context, variables)
  }

  queryRouteData (route, docOrQuery) {
    const emptyData = { data: {}}

    if (!route.matched.length) return emptyData

    const { pageQuery } = route.matched[0].components.default()
    const variables = { ...route.params, path: route.path }

    return pageQuery.query
      ? this.graphql(pageQuery.query, variables)
      : emptyData
  }

  broadcast (message, hotReload = true) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }

    return hotReload
      ? this.generator.generate('now.js')
      : undefined
  }
}

module.exports = App
