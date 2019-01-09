const fs = require('fs-extra')
const chalk = require('chalk')
const express = require('express')
const createApp = require('./app')
const compileAssets = require('./webpack/compileAssets')
const createExpressServer = require('./server/createExpressServer')
const createSockJsServer = require('./server/createSockJsServer')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args })
  const { config, plugins } = app

  await plugins.callHook('beforeServe', { context, config })
  await fs.ensureDir(config.cacheDir)
  await fs.remove(config.outDir)

  const server = await createExpressServer(app)
  const sock = await createSockJsServer(app)

  await compileAssets(context, config, plugins, {
    'SOCKJS_ENDPOINT': JSON.stringify(sock.url),
    'GRAPHQL_ENDPOINT': JSON.stringify(server.url.graphql),
    'GRAPHQL_WS_ENDPOINT': JSON.stringify(server.url.websocket)
  })

  server.app.use(express.static(config.outDir))
  server.app.use(express.static(config.staticDir))

  server.app.get('*', require('./server/middlewares/renderer')(app))

  await plugins.callHook('afterServe', { context, config, app })

  server.app.listen(server.port, server.host, err => {
    if (err) throw err

    console.log()
    console.log(`  Site running at: ${chalk.cyan(server.url.site)}`)
    console.log()
  })
}
