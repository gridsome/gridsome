const path = require('path')
const fs = require('fs')
const isUrl = require('is-url')
const Router = require('vue-router')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const dotenv = require('dotenv')
const BaseStore = require('./BaseStore')
const PluginAPI = require('./PluginAPI')
const CodeGenerator = require('./CodeGenerator')
const AssetsQueue = require('./queue/AssetsQueue')
const createSchema = require('../graphql/createSchema')
const loadConfig = require('./loadConfig')
const { defaultsDeep } = require('lodash')
const createRoutes = require('./createRoutes')
const { execute, graphql } = require('../graphql/graphql')
const { version } = require('../../package.json')
const { parseUrl, resolvePath } = require('../utils')
const { info } = require('../utils/log')

class App {
  constructor (context, options) {
    this.initProcessEnv(context)
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

  initProcessEnv (context) {
    const env = process.env.NODE_ENV || 'development'
    const envPathByMode = path.resolve(context, `./.env.${env}`)
    const envPath = path.resolve(context, `./.env`)
    const readPath = this.existsSync(envPathByMode) ? envPathByMode : envPath

    let parsed = {}
    try {
      parsed = dotenv.parse(fs.readFileSync(readPath, { encoding: `utf8` }))
    } catch (err) {
      if (err.code !== `ENOENT`) {
        console.error(`There was a problem processing the .env file`, err)
      }
    }

    Object.assign(process.env, parsed)
  }

  async bootstrap (phase) {
    const bootstrapTime = hirestime()

    const phases = [
      { title: 'Initialize', run: this.init },
      { title: 'Load sources', run: this.loadSources },
      { title: 'Create GraphQL schema', run: this.createSchema },
      { title: 'Generate code', run: this.generateFiles }
    ]

    info(`Gridsome v${version}\n`)

    for (const current of phases) {
      if (phases.indexOf(current) <= phase) {
        const timer = hirestime()
        await current.run(this)

        info(`${current.title} - ${timer(hirestime.S)}s`)
      }
    }

    info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    this.isBootstrapped = true

    return this
  }

  //
  // bootstrap phases
  //

  init () {
    this.store = new BaseStore(this)
    this.queue = new AssetsQueue(this)
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

    // run config.chainWebpack after all plugins
    if (typeof this.config.chainWebpack === 'function') {
      this.on('chainWebpack', {
        handler: this.config.chainWebpack
      })
    }

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
    this.routes = createRoutes(this)

    this.router = new Router({
      base: '/',
      mode: 'history',
      fallback: false,
      routes: this.routes.map(page => ({
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
    let rootDir = null

    if (typeof isAbsolute === 'string') {
      rootDir = isUrl(isAbsolute)
        ? parseUrl(isAbsolute).fullUrl
        : isAbsolute
    }

    if (isAbsolute === true) {
      rootDir = isUrl(fromPath)
        ? parseUrl(fromPath).baseUrl
        : this.context
    }

    return resolvePath(fromPath, toPath, rootDir)
  }

  existsSync (path) {
    try {
      fs.accessSync(path)
      return true
    } catch (_) {
      return false
    }
  }

  graphql (docOrQuery, variables = {}) {
    const context = this.createSchemaContext()

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

  createSchemaContext () {
    return {
      store: this.store,
      config: this.config,
      queue: this.queue
    }
  }
}

module.exports = App
