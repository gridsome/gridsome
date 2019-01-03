const path = require('path')
const express = require('express')
const resolvePort = require('./resolvePort')
const graphqlHTTP = require('express-graphql')
const graphqlMiddleware = require('./middlewares/graphql')
const { forwardSlash } = require('../utils')

const endpoint = {
  graphql: '/___graphql',
  explore: '/___explore'
}

module.exports = async app => {
  const port = await resolvePort(app.config.port)
  const { config, schema } = app
  const server = express()

  server.use(
    endpoint.graphql,
    graphqlMiddleware(app),
    graphqlHTTP({ schema, context: app.createSchemaContext() })
  )

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
