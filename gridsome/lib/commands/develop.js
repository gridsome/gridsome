module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const fs = require('fs-extra')
  const chalk = require('chalk')
  const webpack = require('webpack')
  const Service = require('../Service')
  const resolvePort = require('./utils/resolvePort')
  const createWorker = require('./utils/createWorker')
  const createServer = require('./utils/createServer')
  const createSockJsServer = require('./utils/createSockJsServer')
  const createClientConfig = require('../webpack/createClientConfig')

  const service = new Service(context, { args })
  const { config, system, clients, plugins } = await service.bootstrap()
  const port = await resolvePort(config.port)
  const host = config.host || 'localhost'
  const { endpoints } = createServer

  const sockjsEndpoint = await createSockJsServer(host, clients)
  const fullUrl = `http://${host}:${port}`
  const gqlEndpoint = fullUrl + endpoints.graphql
  const exploreEndpoint = fullUrl + endpoints.explore
  const wsEndpoint = `ws://${host}:${port}${endpoints.graphql}`
  const clientConfig = createClientConfig(context, config, plugins)

  clientConfig
    .plugin('dev-endpoints')
      .use(require('webpack/lib/DefinePlugin'), [{
        'SOCKJS_ENDPOINT': JSON.stringify(sockjsEndpoint),
        'GRAPHQL_ENDPOINT': JSON.stringify(gqlEndpoint),
        'GRAPHQL_WS_ENDPOINT': JSON.stringify(wsEndpoint)
      }])

  clientConfig.entryPoints.store.forEach((entry, name) => {
    clientConfig.entry(name)
      .prepend(`webpack-hot-middleware/client?name=${name}&reload=true`)
      .prepend('webpack/hot/dev-server')
  })

  await fs.remove(config.cacheDir)

  const webpackConfig = clientConfig.toConfig()
  const compiler = webpack(webpackConfig)
  const worker = createWorker(config, system.cpus.logical)
  const app = createServer(service, worker)

  app.use(require('connect-history-api-fallback')())
  app.use(require('webpack-hot-middleware')(compiler, {
    quiet: true,
    log: false
  }))

  const devMiddleware = require('webpack-dev-middleware')(compiler, {
    publicPath: webpackConfig.output.publicPath,
    logLevel: 'error',
    noInfo: true
  })

  devMiddleware.waitUntilValid(() => {
    console.log()
    console.log(`  Site running at:          ${chalk.cyan(fullUrl)}`)
    console.log(`  Explore GraphQL data at:  ${chalk.cyan(exploreEndpoint)}`)
    console.log()
  })

  app.use(devMiddleware)

  app.listen(port, host, err => {
    if (err) throw err
  })
}
