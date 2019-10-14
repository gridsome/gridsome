const fs = require('fs-extra')
const chalk = require('chalk')
const express = require('express')
const createApp = require('./app')
const { uniqBy } = require('lodash')
const Server = require('./server/Server')
const pathToRegexp = require('path-to-regexp')
const { prepareUrls } = require('./server/utils')
const resolvePort = require('./server/resolvePort')
const compileAssets = require('./webpack/compileAssets')
const { removeStylesJsChunk } = require('./webpack/utils')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args })
  const port = await resolvePort(app.config.port)
  const hostname = app.config.host
  const urls = prepareUrls(hostname, port)
  const server = new Server(app, urls)
  const { config } = app

  await app.plugins.run('beforeServe', { context, config })

  await fs.ensureDir(config.cacheDir)
  await fs.emptyDir(config.outputDir)

  const routes = createRoutes(app)

  const stats = await compileAssets(app, {
    'process.env.SOCKJS_ENDPOINT': JSON.stringify(urls.sockjs.url),
    'process.env.GRAPHQL_ENDPOINT': JSON.stringify(urls.graphql.url)
  })

  if (config.css.split !== true) {
    await removeStylesJsChunk(stats, config.outputDir)
  }

  server.hooks.setup.tap('serve', server => {
    server.use(express.static(config.outputDir))
    server.get('*', require('./server/middlewares/renderer')(app, routes))
  })

  await app.plugins.run('afterServe', { context, config, app })

  server.listen(port, hostname, err => {
    if (err) throw err

    console.log()
    console.log(`  Site running at: ${chalk.cyan(urls.local.pretty)}`)
    console.log()
  })
}

function createRoutes (app) {
  const pages = uniqBy(app.pages.data(), page => page.route)

  return pages.map(page => {
    const keys = []
    const regex = pathToRegexp(page.route, keys)
    const toPath = pathToRegexp.compile(page.route)

    return {
      regex,
      path: page.path,
      route: page.route,
      query: page.query,

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
