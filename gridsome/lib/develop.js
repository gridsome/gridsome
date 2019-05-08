const fs = require('fs-extra')
const chalk = require('chalk')
const { debounce } = require('lodash')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const createApp = require('./app')
  const app = await createApp(context, { args })
  const { config } = app

  const express = require('express')
  const createExpressServer = require('./server/createExpressServer')
  const createSockJsServer = require('./server/createSockJsServer')
  const server = await createExpressServer(app, { withExplorer: true })
  const sock = await createSockJsServer(app)

  await fs.emptyDir(config.cacheDir)

  server.app.use(config.pathPrefix, express.static(config.staticDir))
  server.app.use(require('connect-history-api-fallback')())

  const webpackConfig = await createWebpackConfig(app)
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

  const createPages = debounce(() => app.createPages(), 16)
  const fetchQueries = debounce(() => app.broadcast({ type: 'fetch' }), 16)
  const generateRoutes = debounce(() => app.codegen.generate('routes.js'), 16)

  app.store.on('change', createPages)
  app.pages.on('create', generateRoutes)
  app.pages.on('remove', generateRoutes)

  app.pages.on('update', (page, oldPage) => {
    const { path: oldPath, query: oldQuery } = oldPage
    const { path, query } = page

    if (
      (path !== oldPath && !page.internal.isDynamic) ||
      // pagination was added or removed in page-query
      (query.paginate && !oldQuery.paginate) ||
      (!query.paginate && oldQuery.paginate) ||
      // page-query was created or removed
      (query.document && !oldQuery.document) ||
      (!query.document && oldQuery.document)
    ) {
      return generateRoutes()
    }

    fetchQueries()
  })

  //
  // helpers
  //

  async function createWebpackConfig (app) {
    const { SOCKJS_ENDPOINT, GRAPHQL_ENDPOINT, GRAPHQL_WS_ENDPOINT } = process.env

    const config = await app.resolveChainableWebpackConfig()

    config
      .plugin('friendly-errors')
      .use(require('friendly-errors-webpack-plugin'))

    config
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

    config.entryPoints.store.forEach((entry, name) => {
      config.entry(name)
        .prepend(`webpack-hot-middleware/client?name=${name}&reload=true`)
        .prepend('webpack/hot/dev-server')
    })

    return app.resolveWebpackConfig(false, config)
  }
}
