const path = require('path')
const fs = require('fs-extra')
const uuid = require('uuid/v1')
const Datastore = require('nedb')
const PluginAPI = require('./PluginAPI')
const SourceAPI = require('./SourceAPI')
const generateFiles = require('./codegen')
const { graphql } = require('./graphql/graphql')
const createSchema = require('./graphql/create-schema')
const { info, warn, error } = require('@vue/cli-shared-utils')

const {
  BOOTSTRAP_CONFIG,
  BOOTSTRAP_PLUGINS,
  BOOTSTRAP_SOURCES,
  BOOTSTRAP_CODEGEN
} = require('./utils/const/bootstrap')

module.exports = class Service {
  constructor (api) {
    process.GRIDSOME_SERVICE = this

    this.api = api
    this.context = api.service.context
    this.clients = {}

    this.pages = new Datastore()

    this.config = {}
    this.plugins = []
    this.sources = []

    this.schema = {}
    this.transformers = {}

    // provide log helpers from Vue CLI
    this.info = info
    this.warn = warn
    this.error = error
  }

  broadcast (message) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }
  }

  async bootstrap (phase = BOOTSTRAP_CODEGEN) {
    switch (phase) {
      case BOOTSTRAP_CONFIG : return this.bootstrapConfig()
      case BOOTSTRAP_PLUGINS : return this.bootstrapPlugins()
      case BOOTSTRAP_SOURCES : return this.bootstrapSources()
      case BOOTSTRAP_CODEGEN : return this.bootstrapCodegen()
    }
  }

  bootstrapConfig () {
    info('Loading configuration...')
    this.loadConfig()
  }

  async bootstrapPlugins () {
    this.bootstrapConfig()

    info('Initializing plugins...')
    await this.resolvePlugins()
  }

  async bootstrapSources () {
    await this.bootstrapPlugins()

    info('Loading sources...')
    await this.loadSources()

    info('Transforming sources...')
    await this.transformSources()

    info('Creating GraphQL schema...')
    await this.createGraphQLSchema()
  }

  async bootstrapCodegen () {
    await this.bootstrapSources()

    info('Genrating temporary files...')
    await generateFiles(this)
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }

  graphql (docOrQuery, variables = {}) {
    const func = typeof docOrQuery === 'object' ? execute : graphql
    return func(this.schema, docOrQuery, null, null, variables)
  }

  loadConfig () {
    const configPath = this.resolve('gridsome.config.js')
    const hasConfig = fs.existsSync(configPath)
    const projectConfig = Object.assign({
      tmpDir: this.resolve('src/.temp'),
      publicDir: this.resolve('public'),
      plugins: []
    }, hasConfig ? require(configPath) : {})

    // insert internal plugins
    projectConfig.plugins.splice(0, 0, ...[
      './plugins/source-vue',
      './plugins/transformer-json',
      './plugins/transformer-yaml'
    ])

    this.config = projectConfig
  }

  async resolvePlugins () {
    const normalizePlugin = plugin => typeof plugin === 'string'
      ? { use: plugin, client: true, options: {} }
      : { client: true, options: {}, ...plugin }

    const plugins = Array.isArray(this.config.plugins)
      ? this.config.plugins.map(normalizePlugin).filter(plugin => !!plugin.use)
      : []

    for (const plugin of plugins) {
      plugin.uid = uuid()
      plugin.api = new PluginAPI(this, plugin)

      try {
        const func = require(plugin.use)
        await func(plugin.api, plugin.options)
      } catch {}
    }

    this.plugins = plugins
  }

  async loadSources () {
    for (const plugin of this.plugins) {
      if (typeof plugin.api.initSource === 'function') {
        const source = new SourceAPI(this, plugin)
        await plugin.api.initSource(source)

        this.sources.push({ plugin, source })
      }
    }
  }

  async transformSources () {
    for (const { source } of this.sources) {
      await source.transformAll()
    }
  }

  async createGraphQLSchema () {
    this.schema = await createSchema(this)
  }
}
