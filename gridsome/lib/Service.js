const path = require('path')
const fs = require('fs-extra')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const Store = require('./utils/Store')
const Plugins = require('./utils/Plugins')
const generateFiles = require('./codegen')
const { BOOTSTRAP_FULL } = require('./utils')
const createSchema = require('./graphql/createSchema')
const resolveConfig = require('./utils/resolveConfig')
const prepareRoutes = require('./utils/prepareRoutes')
const { execute, graphql } = require('./graphql/graphql')
const createTransformers = require('./utils/createTransformers')

class Service {
  constructor (context, options = {}) {
    process.GRIDSOME_SERVICE = this

    this.context = context
    this.options = options
    this.pkg = options.pkg || this.resolvePkg()
    this.config = this.resolveConfig()
    this.clients = {}

    autoBind(this)
  }

  async bootstrap (phase = BOOTSTRAP_FULL) {
    const bootstrapTime = hirestime()

    const phases = [
      { title: 'Initialize', run: this.init },
      { title: 'Run plugins', run: this.runPlugins },
      { title: 'Create GraphQL schema', run: this.createSchema },
      { title: 'Generate temporary files', run: this.generateRoutes }
    ]

    console.info('Bootstrapping...')

    for (const current of phases) {
      if (phases.indexOf(current) <= phase) {
        const timer = hirestime()
        await current.run(this)

        console.info(`${current.title} - ${timer(hirestime.S)}s`)
      }
    }

    await this.plugins.callHook('afterBootstrap')

    console.info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    return this
  }

  //
  // bootstrap phases
  //

  init () {
    this.transformers = createTransformers(this)
    this.store = new Store(this)
    this.plugins = new Plugins(this)

    this.plugins.on('broadcast', message => {
      this.broadcast(message)
    })

    this.plugins.on('generateRoutes', () => {
      this.generateRoutes()
    })

    return this.plugins.callHook('init')
  }

  runPlugins () {
    return this.plugins.run()
  }

  async createSchema () {
    const queries = await this.plugins.callHook('createSchemaQueries', {
      store: this.store
    })

    this.schema = createSchema(this.store, {
      queries: queries.length ? Object.assign(...queries) : {}
    })
  }

  generateRoutes () {
    this.routerData = prepareRoutes(this.store)
    return generateFiles(this)
  }

  //
  // helpers
  //

  resolve (p) {
    return path.resolve(this.context, p)
  }

  resolvePkg () {
    const pkgPath = this.resolve('package.json')

    try {
      const content = fs.readFileSync(pkgPath, 'utf-8')
      return JSON.parse(content)
    } catch (err) {}

    return {}
  }

  resolveConfig () {
    return resolveConfig(this.context, this.options)
  }

  graphql (docOrQuery, variables = {}) {
    const context = { store: this.store }
    const func = typeof docOrQuery === 'object' ? execute : graphql

    return func(this.schema, docOrQuery, undefined, context, variables)
  }

  broadcast (message) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }
  }
}

module.exports = Service
