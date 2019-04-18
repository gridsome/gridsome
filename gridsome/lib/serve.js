const fs = require('fs-extra')
const chalk = require('chalk')
const express = require('express')
const createApp = require('./app')
const pathToRegexp = require('path-to-regexp')
const compileAssets = require('./webpack/compileAssets')
const createExpressServer = require('./server/createExpressServer')
const createSockJsServer = require('./server/createSockJsServer')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args })
  const { config } = app

  await app.dispatch('beforeServe', { context, config })
  await fs.ensureDir(config.cacheDir)
  await fs.remove(config.outDir)

  const routes = createRoutes(app)
  const server = await createExpressServer(app)
  const sock = await createSockJsServer(app)

  const { SOCKJS_ENDPOINT, GRAPHQL_ENDPOINT, GRAPHQL_WS_ENDPOINT } = process.env

  await compileAssets(app, {
    'process.env.SOCKJS_ENDPOINT': JSON.stringify(SOCKJS_ENDPOINT || sock.url),
    'process.env.GRAPHQL_ENDPOINT': JSON.stringify(GRAPHQL_ENDPOINT || server.url.graphql),
    'process.env.GRAPHQL_WS_ENDPOINT': JSON.stringify(GRAPHQL_WS_ENDPOINT || server.url.websocket)
  })

  server.app.use(express.static(config.outDir))
  server.app.use(express.static(config.staticDir))

  server.app.get('*', require('./server/middlewares/renderer')(app, routes))

  await app.dispatch('afterServe', { context, config, app })

  server.app.listen(server.port, server.host, err => {
    if (err) throw err

    console.log()
    console.log(`  Site running at: ${chalk.cyan(server.url.site)}`)
    console.log()
  })
}

function createRoutes (app) {
  return app.routes.map(route => {
    const keys = []
    const path = route.route || route.path
    const regex = pathToRegexp(path, keys)
    const toPath = pathToRegexp.compile(path)

    return {
      regex,
      path: route.path,
      route: route.route,
      pageQuery: route.pageQuery,

      toParams (url) {
        const matches = regex.exec(url)
        const params = {}

        keys.forEach((key, index) => {
          if (typeof key === 'object') {
            params[key.name] = matches[index + 1]
          }
        })

        return params
      },

      toPath (params) {
        return toPath(params)
      }
    }
  })
}
