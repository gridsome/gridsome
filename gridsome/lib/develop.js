const fs = require('fs-extra')
const chalk = require('chalk')
const express = require('express')
const createApp = require('./app')
const createExpressServer = require('./server/createExpressServer')
const createSockJsServer = require('./server/createSockJsServer')
const createClientConfig = require('./webpack/createClientConfig')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args })
  const { config } = app

  const server = await createExpressServer(app, { withExplorer: true })
  const sock = await createSockJsServer(app)

  await fs.remove(config.cacheDir)
  await fs.ensureDir(config.cacheDir)

  server.app.use(config.pathPrefix, express.static(config.staticDir))
  server.app.use(require('connect-history-api-fallback')())

  const webpackConfig = await createWebpackConfig()
  const compiler = require('webpack')(webpackConfig)
  server.app.use(require('webpack-hot-middleware')(compiler, {
    quiet: true,
    log: false
  }))

  const devMiddleware = require('webpack-dev-middleware')(compiler, {
    pathPrefix: webpackConfig.output.pathPrefix,
    logLevel: 'silent'
  })

  compiler.hooks.done.tap('gridsome develop', stats => {
    if (stats.hasErrors()) {
      return
    }

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

  async function createWebpackConfig () {
    const clientConfig = await createClientConfig(app)
    const { SOCKJS_ENDPOINT, GRAPHQL_ENDPOINT, GRAPHQL_WS_ENDPOINT } = process.env

    clientConfig
      .plugin('friendly-errors')
      .use(require('friendly-errors-webpack-plugin'))

    clientConfig
      .plugin('injections')
      .tap(args => {
        const definitions = args[0]
        args[0] = {
          ...definitions,
          'process.env.SOCKJS_ENDPOINT': JSON.stringify(SOCKJS_ENDPOINT || sock.url),
          'process.env.GRAPHQL_ENDPOINT': JSON.stringify(GRAPHQL_ENDPOINT || server.url.graphql),
          'process.env.GRAPHQL_WS_ENDPOINT': JSON.stringify(GRAPHQL_WS_ENDPOINT || server.url.websocket)
        }
        return args
      })

    clientConfig.entryPoints.store.forEach((entry, name) => {
      clientConfig.entry(name)
        .prepend(`webpack-hot-middleware/client?name=${name}&reload=true`)
        .prepend('webpack/hot/dev-server')
    })

    return clientConfig.toConfig()
  }
}
