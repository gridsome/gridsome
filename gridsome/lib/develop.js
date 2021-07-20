const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const sockjs = require('sockjs')
const WebpackDevServer = require('webpack-dev-server')
const { hasWarnings, logAllWarnings } = require('./utils/deprecate')
const { forwardSlash } = require('./utils')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const createApp = require('./app')
  const app = await createApp(context, { args, mode: 'development' })

  await fs.emptyDir(app.config.imageCacheDir)

  const compiler = app.compiler.getCompiler()
  const server = await createDevServer(app, compiler)
  let isDone = false

  compiler.hooks.infrastructureLog.tap('gridsome', (name, type, messages) => {
    if (type === 'error') return

    if (name === 'webpack-dev-middleware') return false
    if (name === 'webpack-dev-server') {
      if (isDone) {
        const message = messages
          .filter(m => !m.includes('Project is running at'))
          .filter(m => !m.includes('fallback'))
          .join(' ')
          .replace('Loopback:', 'Project is running at:')
          .replace(/(https?:\/\/[^\s]+)/g, chalk.cyan('$1'))
          .replace(app.context, '.')

        if (message) {
          console.log(`  ${message}`)
        }
      }
      return isDone
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
    console.log()
  })

  server.listen()
}

async function createDevServer(app, compiler) {
  const webpackConfig = app.compiler.getClientConfig()
  const devServer = webpackConfig.devServer || {}
  const onListening = devServer.onListening
  const onBeforeSetupMiddleware = devServer.onBeforeSetupMiddleware

  devServer.static = [app.config.staticDir, ...(devServer.static || [])]

  devServer.onListening = (server) => {
    createSocketServer(app, server)
    onListening && onListening(server)
  }

  devServer.onBeforeSetupMiddleware = (server) => {
    setupGraphQLMiddleware(app, server)
    setupAssetsMiddleware(app, server)
    onBeforeSetupMiddleware && onBeforeSetupMiddleware(server)
  }

  const server = new WebpackDevServer(compiler, devServer)

  await app.plugins.configureServer(server.app)

  return server
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

function setupGraphQLMiddleware(app, server) {
  const express = require('express')
  const { graphqlHTTP } = require('express-graphql')
  const { default: playground } = require('graphql-playground-middleware-express')
  const graphqlMiddleware = require('./server/middlewares/graphql')

  server.app.use(
    '/___graphql',
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
  )

  server.app.get(
    '/___explore',
    playground({
      endpoint: '/___graphql',
      title: 'Gridsome GraphQL Explorer',
      faviconUrl: 'https://avatars0.githubusercontent.com/u/17981963?s=200&v=4'
    })
  )
}

function setupAssetsMiddleware(app, server) {
  const assetsMiddleware = require('./server/middlewares/assets')
  const assetsDir = path.relative(app.config.outputDir, app.config.assetsDir)
  const assetsPath = forwardSlash(path.join(app.config.pathPrefix, assetsDir))
  const assetsRE = new RegExp(`${assetsPath}/(files|static)/(.*)`)

  server.app.get(assetsRE, assetsMiddleware(app))
}
