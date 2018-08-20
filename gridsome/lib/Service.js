const path = require('path')
const fs = require('fs-extra')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const Datastore = require('./Datastore')
const generateFiles = require('./codegen')
const { BOOTSTRAP_FULL } = require('./utils')
const runPlugins = require('./utils/runPlugins')
const createSchema = require('./graphql/createSchema')
const resolveConfig = require('./utils/resolveConfig')
const prepareRoutes = require('./utils/prepareRoutes')
const { execute, graphql } = require('./graphql/graphql')
const resolveTransformers = require('./utils/resolveTransformers')

class Service {
  constructor (context, options = {}) {
    process.GRIDSOME_SERVICE = this

    this.context = context
    this.options = options
    this.logger = global.console
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

    this.logger.info('Bootstrapping...')

    for (const current of phases) {
      if (phases.indexOf(current) <= phase) {
        const timer = hirestime()
        await current.run(this)

        this.logger.info(`${current.title} - ${timer(hirestime.S)}s`)
      }
    }

    this.logger.info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    return this
  }

  //
  // bootstrap phases
  //

  init () {
    this.transformers = resolveTransformers(this)
    this.store = new Datastore()
  }

  async runPlugins () {
    this.plugins = await runPlugins(this)
  }

  createSchema () {
    this.schema = createSchema(this.store)
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
