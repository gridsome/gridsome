const path = require('path')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const Datastore = require('./Datastore')
const createSchema = require('./graphql/createSchema')
const { execute, graphql } = require('./graphql/graphql')

const { BOOTSTRAP_FULL } = require('./bootstrap')
const resolvePackageJson = require('./bootstrap/resolvePackageJson')
const resolveProjectConfig = require('./bootstrap/resolveProjectConfig')
const resolveTransformers = require('./bootstrap/resolveTransformers')
const prepareRoutes = require('./bootstrap/prepareRoutes')
const runPlugins = require('./bootstrap/runPlugins')
const generateFiles = require('./codegen')

class Service {
  constructor (context, options = {}) {
    process.GRIDSOME_SERVICE = this

    this.context = context
    this.options = options
    this.logger = global.console
    this.clients = {}

    autoBind(this)
  }

  async bootstrap (phase = BOOTSTRAP_FULL) {
    const bootstrapTime = hirestime()

    const phases = [
      { title: 'Initialize', run: this.init },
      { title: 'Run plugins', run: runPlugins },
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
    const { context, options } = this

    this.pkg = options.pkg || resolvePackageJson(context)
    this.config = resolveProjectConfig(context, options)
    this.transformers = resolveTransformers(this, options)
    this.store = new Datastore()
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
