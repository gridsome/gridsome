const path = require('path')
const express = require('express')
const resolvePort = require('./resolvePort')
const graphqlHTTP = require('express-graphql')
const graphqlMiddleware = require('./middlewares/graphql')
const { default: playground } = require('graphql-playground-middleware-express')
const { forwardSlash } = require('../utils')

const endpoint = {
  graphql: '/___graphql',
  explore: '/___explore'
}

module.exports = async (app, options = {}) => {
  const port = await resolvePort(app.config.port)
  const { config, schema } = app
  const server = express()

  await app.events.dispatch('configureServer', null, server, {
    host: config.host,
    port
  })

  if (process.env.NODE_ENV === 'development') {
    server.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })
  }

  server.use(
    endpoint.graphql,
    express.json(),
    graphqlMiddleware(app),
    graphqlHTTP({
      schema,
      context: app.createSchemaContext(),
      formatError: err => ({
        message: err.message,
        stringified: err.toString()
      }),
      extensions ({ variables }) {
        if (variables && variables.__path) {
          const page = app.pages.findPage({
            path: variables.__path
          })

          return {
            context: page ? page.context : {}
          }
        }
      }
    })
  )

  if (options.withExplorer) {
    server.get(
      endpoint.explore,
      playground({
        endpoint: endpoint.graphql,
        title: 'Gridsome GraphQL Explorer',
        faviconUrl: 'https://avatars0.githubusercontent.com/u/17981963?s=200&v=4'
      })
    )
  }

  const assetsDir = path.relative(config.outDir, config.assetsDir)
  const assetsPath = forwardSlash(path.join(config.pathPrefix, assetsDir))
  const assetsRE = new RegExp(`${assetsPath}/(files|static)/(.*)`)
  server.get(assetsRE, require('./middlewares/assets')(app))

  const createUrl = (endpoint, protocol = 'http') => {
    return `${protocol}://${config.host}:${port}${forwardSlash(endpoint)}`
  }

  return {
    app: server,
    host: config.host,
    port,
    endpoint,
    url: {
      graphql: createUrl(endpoint.graphql),
      explore: createUrl(endpoint.explore),
      websocket: createUrl(endpoint.graphql, 'ws'),
      site: createUrl('/')
    }
  }
}

module.exports.endpoint = endpoint
