const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const sockjs = require('sockjs')
const { hasWarnings, logAllWarnings } = require('./utils/deprecate')
const { forwardSlash } = require('./utils')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const createApp = require('./app')
  const app = await createApp(context, { args, mode: 'development' })

  await fs.emptyDir(app.config.imagesDir)

  const compiler = app.compiler.getCompiler()
  const server = await createDevServer(app, compiler)
  let isDone = false

  compiler.hooks.infrastructureLog.tap('gridsome', (name, type, messages) => {
    if (name !== 'webpack.Progress' && !isDone) {
      return false // Prevents logging until webpack is ready.
    }

    if (name === 'webpack.Progress' && type === 'status' && messages[1] === 'done') {
      return false
    }

    if (name === 'webpack-dev-server') {
      if (!isDone) return false

      const message = messages
        .join(' ')
        .replace(/(https?:\/\/[^\s]+)/g, chalk.cyan('$1'))
        .replace(app.context, '.')

      if (message.startsWith('Loopback:')) {
        const url = message.match(/https?:\/\/.*/) || []
        console.log(`  Loopback: ${chalk.cyan(url)}`)
        console.log(`  Explore GraphQL data at: ${chalk.cyan(`${url}___explore`)}`)
      } else if (message.startsWith('[connect-history-api-fallback]')) {
        return false
      } else  {
        console.log(`  ${message}`)
      }

      return false
    }
  })

  compiler.hooks.done.tap('gridsome', stats => {
    if (stats.hasErrors()) {
      return
    }

    isDone = true

    if (hasWarnings()) {
      console.log(`${chalk.bgYellow.black(' WARNING ')} ${chalk.yellow('Deprecation notices')}`)
      console.log()
      logAllWarnings(app.context)
      console.log()
    }

    server.logStatus()
  })

  await server.start()
}

async function createDevServer(app, compiler) {
  const WebpackDevServer = require('webpack-dev-server')
  const webpackConfig = app.compiler.getClientConfig()
  const devServer = webpackConfig.devServer || {}
  const onListening = devServer.onListening
  const setupMiddlewares = devServer.setupMiddlewares

  devServer.static = [app.config.staticDir, ...(devServer.static || [])]

  devServer.onListening = (server) => {
    createSocketServer(app, server)
    onListening && onListening(server)
  }

  devServer.setupMiddlewares = (middlewares, server) => {
    setupAssetsMiddleware(middlewares, app)
    setupGraphQLMiddleware(middlewares, app)

    app.plugins.configureServer(server.app)

    return setupMiddlewares
      ? setupMiddlewares(middlewares, server)
      : middlewares
  }

  return new WebpackDevServer(devServer, compiler)
}

function createSocketServer(app, server) {
  const echo = sockjs.createServer({ log: () => null })
  echo.on('connection', (connection) => {
    if (connection) {
      app.clients[connection.id] = connection
      connection.on('close', () => {
        delete app.clients[connection.id]
      })
    }
  })
  echo.installHandlers(server.server, {
    prefix: '/___echo'
  })
}

function setupGraphQLMiddleware(middlewares, app) {
  const express = require('express')
  const { graphqlHTTP } = require('express-graphql')
  const { default: playground } = require('graphql-playground-middleware-express')
  const graphqlMiddleware = require('./server/middlewares/graphql')
  const index = middlewares.findIndex((m) => m.name === 'connect-history-api-fallback')

  middlewares.splice(index, 0, {
    name: 'gridsome-explore',
    path: '/___explore',
    middleware: playground({
      endpoint: '/___graphql',
      title: 'Gridsome GraphQL Explorer',
      faviconUrl: 'https://avatars0.githubusercontent.com/u/17981963?s=200&v=4'
    })
  })

  middlewares.splice(index, 0, {
    name: 'gridsome-graphql',
    path: '/___graphql',
    middleware: [
      express.json(),
      graphqlMiddleware(app),
      graphqlHTTP({
        schema: app.schema.getSchema(),
        context: app.schema.createContext(),
        customFormatErrorFn: err => ({
          message: err.message,
          stringified: err.toString()
        }),
        extensions: ({ variables }) => {
          if (variables && variables.__path) {
            const page = app.pages._pages.findOne({
              path: variables.__path
            })

            const context = page
              ? app.pages._createPageContext(page, variables)
              : {}

            return { context }
          }
        }
      })
    ]
  })
}

function setupAssetsMiddleware(middlewares, app) {
  const assetsMiddleware = require('./server/middlewares/assets')
  const assetsDir = path.relative(app.config.outputDir, app.config.assetsDir)
  const assetsPath = forwardSlash(path.join(app.config.pathPrefix, assetsDir))
  const assetsRE = new RegExp(`^/${assetsPath}/(files|static)/(.*)`)

  middlewares.push({
    name: 'gridsome-assets',
    path: assetsRE,
    middleware: assetsMiddleware(app)
  })
}
