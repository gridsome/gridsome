module.exports = async (context, options) => {
  process.env.NODE_ENV = 'development'

  const chalk = require('chalk')
  const webpack = require('webpack')
  const Service = require('../Service')
  const resolvePort = require('./utils/resolvePort')
  const createServer = require('./utils/createServer')
  const createSockJsServer = require('./utils/createSockJsServer')
  const createClientConfig = require('../webpack/createClientConfig')

  const service = new Service(context)
  const { clients, schema, store } = await service.bootstrap()
  const port = await resolvePort(options.port)
  const host = options.host || 'localhost'
  const { endpoints } = createServer

  const sockjsEndpoint = await createSockJsServer(host, clients)
  const fullUrl = `http://${host}:${port}`
  const gqlEndpoint = fullUrl + endpoints.graphql
  const exploreEndpoint = fullUrl + endpoints.explore
  const wsEndpoint = `ws://${host}:${port}${endpoints.graphql}`
  const configChain = createClientConfig(context, options)

  configChain
    .plugin('dev-endpoints')
      .use(require('webpack/lib/DefinePlugin'), [{
        'SOCKJS_ENDPOINT': JSON.stringify(sockjsEndpoint),
        'GRAPHQL_ENDPOINT': JSON.stringify(gqlEndpoint),
        'GRAPHQL_WS_ENDPOINT': JSON.stringify(wsEndpoint)
      }])

  configChain.entryPoints.store.forEach((entry, name) => {
    configChain.entry(name)
      .prepend(`webpack-hot-middleware/client?name=${name}&reload=true`)
      .prepend('webpack/hot/dev-server')
  })

  const config = configChain.toConfig()
  const compiler = webpack(config)
  const app = createServer({ host, schema, store })

  app.use(require('connect-history-api-fallback')())
  app.use(require('webpack-hot-middleware')(compiler, {
    quiet: true,
    log: false
  }))

  const devMiddleware = require('webpack-dev-middleware')(compiler, {
    publicPath: config.output.publicPath,
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
