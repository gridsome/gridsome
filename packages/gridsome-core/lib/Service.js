const path = require('path')
const codegen = require('./codegen')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const { Collection } = require('lokijs')
const createSchema = require('./graphql/createSchema')
const { execute, graphql } = require('./graphql/graphql')
const { info, warn, error } = require('@vue/cli-shared-utils')

const { BOOTSTRAP_FULL } = require('./bootstrap')
const resolvePackageJson = require('./bootstrap/resolvePackageJson')
const resolveProjectConfig = require('./bootstrap/resolveProjectConfig')
const resolveTransformers = require('./bootstrap/resolveTransformers')
const runPlugins = require('./bootstrap/runPlugins')
const createRouterData = require('./bootstrap/createRouterData')

class Service {
  constructor (context, options = {}) {
    process.GRIDSOME_SERVICE = this

    this.context = context
    this.clients = {}

    this.pkg = options.pkg || resolvePackageJson(context)
    this.config = resolveProjectConfig(context, options)
    this.transformers = resolveTransformers(this, options)

    this.pages = new Collection('pages', {
      indices: ['type'],
      unique: ['path'],
      autoupdate: true
    })

    autoBind(this)

    this.info = info
    this.warn = warn
    this.error = error
  }

  async bootstrap (phase = BOOTSTRAP_FULL) {
    const bootstrapTime = hirestime()

    const phases = [
      { title: 'Run plugins', run: runPlugins },
      { title: 'Create GraphQL schema', run: createSchema },
      { title: 'Create router data', run: createRouterData },
      { title: 'Generate temporary files', run: codegen }
    ]

    info('Bootstrapping...')

    for (const current of phases) {
      if (phases.indexOf(current) <= phase) {
        const timer = hirestime()
        await current.run(this)

        info(`${current.title} - ${timer(hirestime.S)}s`)
      }
    }

    info(`Bootstrap finish - ${bootstrapTime(hirestime.S)}s`)

    return this
  }

  //
  // helpers
  //

  resolve (p) {
    return path.resolve(this.context, p)
  }

  generate (name) {
    return codegen(this, name)
  }

  graphql (docOrQuery, variables = {}) {
    const func = typeof docOrQuery === 'object' ? execute : graphql
    return func(this.schema, docOrQuery, undefined, undefined, variables)
  }

  broadcast (message) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }
  }
}

module.exports = Service
