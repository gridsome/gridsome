const url = require('url')
const path = require('path')
const chalk = require('chalk')
const devcert = require('devcert')
const express = require('express')
const { SyncHook } = require('tapable')
const graphqlHTTP = require('express-graphql')
const graphqlMiddleware = require('./middlewares/graphql')
const historyApiFallback = require('connect-history-api-fallback')
const { default: playground } = require('graphql-playground-middleware-express')
const { forwardSlash } = require('../utils')
const { info } = require('../utils/log')
const { prepareUrls } = require('./utils')

class Server {
  constructor(app) {
    const { host, port, https } = app.config

    this._app = app
    this.hostname = host
    this.port = port
    this.httpsOptions = null
    this.urls = prepareUrls(host, port, https)

    this.hooks = {
      setup: new SyncHook(['app']),
      afterSetup: new SyncHook(['app'])
    }
  }

  async createExpressApp() {
    const isDev = process.env.NODE_ENV === 'development'
    const app = express()

    if (isDev) {
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        next()
      })
    }

    this.hooks.setup.call(app)

    app.use(
      this.urls.graphql.endpoint,
      express.json(),
      graphqlMiddleware(this._app),
      graphqlHTTP({
        schema: this._app.schema.getSchema(),
        context: this._app.schema.createContext(),
        customFormatErrorFn: err => ({
          message: err.message,
          stringified: err.toString()
        }),
        extensions: ({ variables }) => {
          if (variables && variables.__path) {
            const page = this._app.pages._pages.findOne({
              path: variables.__path
            })

            const context = page
              ? this._app.pages._createPageContext(page, variables)
              : {}

            return { context }
          }
        }
      })
    )

    if (isDev) {
      app.get(
        this.urls.explore.endpoint,
        playground({
          endpoint: this.urls.graphql.endpoint,
          title: 'Gridsome GraphQL Explorer',
          faviconUrl: 'https://avatars0.githubusercontent.com/u/17981963?s=200&v=4'
        })
      )
    }

    app.use(
      this._app.config.publicPath,
      express.static(this._app.config.staticDir)
    )

    const assetsMiddleware = require('./middlewares/assets')
    const assetsDir = path.relative(this._app.config.outputDir, this._app.config.assetsDir)
    const assetsPath = forwardSlash(path.join(this._app.config.pathPrefix, assetsDir))
    const assetsRE = new RegExp(`${assetsPath}/(files|static)/(.*)`)

    if (!process.env.GRIDSOME_TEST) {
      app.get(assetsRE, assetsMiddleware(this._app))
    }

    await this._app.plugins.configureServer(app)

    app.use(historyApiFallback())

    this.hooks.afterSetup.call(app)

    return app
  }

  async generateCertificate() {
    const { hostname } = url.parse(this.urls.local.pretty)

    if (!devcert.hasCertificateFor(hostname)) {
      info(`Creating SSL certificate for: ${chalk.bold(hostname)}`)
    }

    const { caPath, key, cert } = await devcert.certificateFor(hostname, {
      getCaPath: true
    })

    if (caPath) {
      process.env.NODE_EXTRA_CA_CERTS = caPath
    }

    this.httpsOptions = { key, cert }
  }

  async listen() {
    this._app.hooks.server.call(this)

    const app = await this.createExpressApp()

    const server = this.httpsOptions
      ? require('https').createServer(this.httpsOptions, app)
      : require('http').createServer(app)

    if (process.env.NODE_ENV === 'development') {
      const sockjs = require('sockjs')
      const echo = sockjs.createServer({ log: () => null })

      echo.on('connection', connection => {
        if(!connection) return
        this._app.clients[connection.id] = connection

        connection.on('close', () => {
          delete this._app.clients[connection.id]
        })
      })

      echo.installHandlers(server, {
        prefix: this.urls.sockjs.endpoint
      })
    }

    server.listen(this.port, this.host, err => {
      if (err) throw err
    })
  }
}

module.exports = Server
