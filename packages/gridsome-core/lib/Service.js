const path = require('path')
const codegen = require('./codegen')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const { Collection } = require('lokijs')
const createSchema = require('./graphql/createSchema')
const { execute, graphql } = require('./graphql/graphql')
const { info, warn, error } = require('@vue/cli-shared-utils')

const { BOOTSTRAP_FULL } = require('./bootstrap/phases')
const loadConfig = require('./bootstrap/loadConfig')
const initPlugins = require('./bootstrap/initPlugins')
const loadSources = require('./bootstrap/loadSources')
const createRouterData = require('./bootstrap/createRouterData')

module.exports = class Service {
  constructor (context) {
    process.GRIDSOME_SERVICE = this

    this.context = context
    this.clients = {}

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
      { title: 'Load configuration', run: loadConfig },
      { title: 'Initialize plugins', run: initPlugins },
      { title: 'Load sources', run: loadSources },
      { title: 'Create GraphQL schema', run: createSchema },
      { title: 'Create router data', run: createRouterData },
      { title: 'Generate temporary files', run: codegen }
    ]

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
    return func(this.schema, docOrQuery, null, null, variables)
  }

  broadcast (message) {
    for (const client in this.clients) {
      this.clients[client].write(JSON.stringify(message))
    }
  }
}
