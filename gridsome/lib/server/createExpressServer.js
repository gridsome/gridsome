const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const resolvePort = require('./resolvePort')
const graphqlHTTP = require('express-graphql')
const { forwardSlash } = require('../utils')

const endpoint = {
  graphql: '/___graphql',
  explore: '/___explore'
}

module.exports = async app => {
  const port = await resolvePort(app.config.port)
  const { config, schema, store } = app
  const server = express()

  server.use(
    endpoint.graphql,
    bodyParser.json(),
    graphqlHTTP({ schema, context: { store, config }})
  )

  const assetsDir = path.relative(config.targetDir, config.assetsDir)
  const route = path.posix.join(config.pathPrefix, assetsDir, 'static', '*')
  server.get(forwardSlash(route), require('./middlewares/assets')(app))

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
      site: createUrl(path.join(config.pathPrefix, '/'))
    }
  }
}

module.exports.endpoint = endpoint
