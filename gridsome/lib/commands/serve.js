module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'serve'

  const path = require('path')
  const fs = require('fs-extra')
  const chalk = require('chalk')
  const LRU = require('lru-cache')
  const express = require('express')
  const Service = require('../Service')
  const compileAssets = require('./utils/compileAssets')
  const resolvePort = require('./utils/resolvePort')
  const createWorker = require('./utils/createWorker')
  const createServer = require('./utils/createServer')
  const createRenderFn = require('./utils/createRenderFn')
  const createSockJsServer = require('./utils/createSockJsServer')

  const service = new Service(context, { args })
  const { config, clients, plugins } = await service.bootstrap()
  const resolve = p => path.resolve(config.outDir, p)
  const port = await resolvePort(config.port)
  const host = config.host || 'localhost'
  const { endpoints } = createServer

  await plugins.callHook('beforeServe', { context, config })
  await fs.remove(config.outDir)

  const worker = createWorker(config)
  const sockjsEndpoint = await createSockJsServer(host, clients)
  const fullUrl = `http://${host}:${port}`
  const gqlEndpoint = fullUrl + endpoints.graphql
  const wsEndpoint = `ws://${host}:${port}${endpoints.graphql}`

  await compileAssets(context, config, plugins, {
    'SOCKJS_ENDPOINT': JSON.stringify(sockjsEndpoint),
    'GRAPHQL_ENDPOINT': JSON.stringify(gqlEndpoint),
    'GRAPHQL_WS_ENDPOINT': JSON.stringify(wsEndpoint)
  })

  const cache = LRU({
    maxAge: config.maxCacheAge,
    max: 100
  })

  const render = createRenderFn({
    htmlTemplate: config.htmlTemplate,
    clientManifestPath: resolve(config.clientManifestPath),
    serverBundlePath: resolve(config.serverBundlePath)
  })

  const app = createServer(service, worker)

  app.use(express.static(config.outDir))

  app.get('*', async (req, res, next) => {
    const { route } = service.router.resolve(req.url)
    const cached = cache.get(route.fullPath)

    if (cached) {
      return res.end(cached)
    }

    const { data } = await service.queryRouteData(route)

    try {
      const html = await render(route.path, data)
      cache.set(route.fullPath, html)
      res.end(html)
    } catch (err) {
      next(err)
    }
  })

  await plugins.callHook('afterServe', { context, config, app })

  app.listen(port, host, err => {
    if (err) throw err

    const fullUrl = `http://localhost:${port}`

    console.log()
    console.log(`  Site running at: ${chalk.cyan(fullUrl)}`)
    console.log()
  })
}
