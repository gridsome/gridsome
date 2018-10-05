const fs = require('fs-extra')
const chalk = require('chalk')
const createApp = require('./app')
const createExpressServer = require('./server/createExpressServer')
const createSockJsServer = require('./server/createSockJsServer')
const createClientConfig = require('./webpack/createClientConfig')
const { default: playground } = require('graphql-playground-middleware-express')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args })
  const { config, plugins } = app

  const server = await createExpressServer(app)
  const sock = await createSockJsServer(app)

  await fs.remove(config.cacheDir)

  server.app.get(
    server.endpoint.explore,
    playground({ endpoint: server.endpoint.graphql })
  )

  server.app.use(require('connect-history-api-fallback')())

  const webpackConfig = createWebpackConfig()
  const compiler = require('webpack')(webpackConfig)
  server.app.use(require('webpack-hot-middleware')(compiler, {
    quiet: true,
    log: false
  }))

  const devMiddleware = require('webpack-dev-middleware')(compiler, {
    pathPrefix: webpackConfig.output.pathPrefix,
    logLevel: 'error',
    noInfo: true
  })

  devMiddleware.waitUntilValid(() => {
    console.log()
    console.log(`  Site running at:          ${chalk.cyan(server.url.site)}`)
    console.log(`  Explore GraphQL data at:  ${chalk.cyan(server.url.explore)}`)
    console.log()
  })

  server.app.use((req, res, next) => {
    return req.originalUrl !== server.endpoint.explore
      ? devMiddleware(req, res, next)
      : next()
  })

  server.app.listen(server.port, server.host, err => {
    if (err) throw err
  })

  //
  // helpers
  //

  function createWebpackConfig () {
    const clientConfig = createClientConfig(context, config, plugins)

    clientConfig
      .plugin('dev-endpoints')
        .use(require('webpack/lib/DefinePlugin'), [{
          'SOCKJS_ENDPOINT': JSON.stringify(sock.url),
          'GRAPHQL_ENDPOINT': JSON.stringify(server.url.graphql),
          'GRAPHQL_WS_ENDPOINT': JSON.stringify(server.url.websocket)
        }])

    clientConfig.entryPoints.store.forEach((entry, name) => {
      clientConfig.entry(name)
        .prepend(`webpack-hot-middleware/client?name=${name}&reload=true`)
        .prepend('webpack/hot/dev-server')
    })

    return clientConfig.toConfig()
  }
}
