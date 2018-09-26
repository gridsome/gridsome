const path = require('path')
const chalk = require('chalk')
const Router = require('vue-router')
const autoBind = require('auto-bind')
const hirestime = require('hirestime')
const Store = require('./utils/Store')
const Plugins = require('./utils/Plugins')
const generateFiles = require('./codegen')
const { BOOTSTRAP_FULL } = require('./utils')
const ProcessQueue = require('./utils/ProcessQueue')
const createSchema = require('./graphql/createSchema')
const resolveConfig = require('./utils/resolveConfig')
const prepareRoutes = require('./utils/prepareRoutes')
const resolveSystemInfo = require('./utils/resolveSystemInfo')
const { execute, graphql } = require('./graphql/graphql')
const { version } = require('../package.json')

class Service {
  constructor (context, options = {}) {
    process.GRIDSOME_SERVICE = this

    this.clients = {}
    this.context = context
    this.config = resolveConfig(context, options)
    this.system = resolveSystemInfo()

    console.log(`Gridsome v${version}`)
    console.log(chalk.gray(
      `CPU ${this.system.cpus.model} ` +
      `(${this.system.cpus.physical} cores)`
    ))
    console.log()

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
    this.queue = new ProcessQueue(this)
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

    this.router = new Router({
      base: '/',
      mode: 'history',
      fallback: false,
      routes: this.routerData.pages.map(page => ({
        path: page.route || page.path,
        component: () => page
      }))
    })

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

    return hotReload ? generateFiles(this, 'now.js') : undefined
  }
}

module.exports = Service
