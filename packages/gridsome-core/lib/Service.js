const fs = require('fs-extra')
const uuid = require('uuid/v1')
const Datastore = require('nedb')
const codegen = require('./codegen')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const PluginAPI = require('./PluginAPI')
const SourceAPI = require('./SourceAPI')
const { defaultsDeep } = require('lodash')
const createSchema = require('./graphql/createSchema')
const { execute, graphql } = require('./graphql/graphql')
const createRouterData = require('./utils/createRouterData')
const { info, warn, error } = require('@vue/cli-shared-utils')

const {
  BOOTSTRAP_CONFIG,
  BOOTSTRAP_PLUGINS,
  BOOTSTRAP_SOURCES,
  BOOTSTRAP_FULL
} = require('./utils/const/bootstrap')

module.exports = class Service {
  constructor (api) {
    process.GRIDSOME_SERVICE = this

    this.api = api
    this.context = api.service.context
    this.pages = new Datastore()
    this.clients = {}

    autoBind(this)

    this.info = info
    this.warn = warn
    this.error = error
  }

  async bootstrap (phase = BOOTSTRAP_FULL) {
    const bootstrapTime = hirestime()

    const phases = [
      this.bootstrapConfig,
      this.bootstrapPlugins,
      this.bootstrapSources,
      this.bootstrapFull
    ]

    for (const cb of phases) {
      if (phases.indexOf(cb) <= phase) {
        await cb.call(this)
      }
    }

    info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    return this
  }

  bootstrapConfig () {
    info('Loading configuration...')
    this.config = this.loadConfig()
  }

  async bootstrapPlugins () {
    info('Initializing plugins...')
    this.plugins = await this.initPlugins()
  }

  async bootstrapSources () {
    info('Loading sources...')
    this.sources = await this.loadSources()

    info('Creating GraphQL schema...')
    this.schema = await createSchema(this)
  }

  async bootstrapFull () {
    info('Preparing router...')
    this.routerData = await createRouterData(this)

    info('Generating temporary files...')
    this.tempFiles = await codegen(this)
  }

  loadConfig () {
    const configPath = this.resolve('gridsome.config.js')
    const hasConfig = fs.existsSync(configPath)
    const config = Object.assign({
      tmpDir: this.resolve('src/.temp'),
      publicDir: this.resolve('public'),
      plugins: []
    }, hasConfig ? require(configPath) : {})

    // insert internal plugins
    config.plugins.splice(0, 0, ...[
      './plugins/source-vue',
      './plugins/transformer-json',
      './plugins/transformer-yaml'
    ])

    return config
  }

  async initPlugins () {
    const normalizePlugin = plugin => typeof plugin === 'string'
      ? { use: plugin, client: true, options: {}}
      : { client: true, options: {}, ...plugin }

    const plugins = Array.isArray(this.config.plugins)
      ? this.config.plugins.map(normalizePlugin).filter(plugin => !!plugin.use)
      : []

    for (const plugin of plugins) {
      plugin.uid = uuid()
      plugin.api = new PluginAPI(this, plugin)

      try {
        const func = require(plugin.use)
        const options = defaultsDeep(plugin.options, func.defaultOptions)
        await func(plugin.api, options)
      } catch {}
    }

    return plugins
  }

  async loadSources () {
    const sources = []

    for (const plugin of this.plugins) {
      if (typeof plugin.api.initSource === 'function') {
        const source = new SourceAPI(this, plugin)
        await plugin.api.initSource(source)

        sources.push({ plugin, source })
      }
    }

    return sources
  }

  //
  // helpers
  //

  resolve (p) {
    return this.api.resolve(p)
  }

  graphql (docOrQuery, variables = {}) {
    const func = typeof docOrQuery === 'object' ? execute : graphql
    return func(this.schema, docOrQuery, null, null, variables)
  }

  broadcast (message) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }
  }
}
