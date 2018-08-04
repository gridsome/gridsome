const cors = require('cors')
const sockjs = require('sockjs')
const express = require('express')
const { createServer } = require('http')
const portfinder = require('portfinder')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { info, chalk } = require('@vue/cli-shared-utils')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { default: expressPlayground } = require('graphql-playground-middleware-express')

const GRAPHQL_ENDPOINT = '/___graphql'
const EXPLORE_ENDPOINT = '/___explore'
const SUBSCRIPTIONS_PATH = '/___graphql'
const SOCKJS_ENDPOINT = '/echo'

module.exports = ({ schema, clients }, ui = true) => new Promise(async resolve => {
  portfinder.basePort = 5000

  const port = await portfinder.getPortPromise()

  const app = express()
  const echo = sockjs.createServer({ log: () => null })

  echo.on('connection', conn => {
    clients[conn.id] = conn

    conn.on('close', () => {
      delete clients[conn.id]
    })
  })

  app.use(GRAPHQL_ENDPOINT, cors(), bodyParser.json(), graphqlHTTP({ schema }))

  if (ui) {
    app.get(EXPLORE_ENDPOINT, expressPlayground({
      subscriptionEndpoint: SUBSCRIPTIONS_PATH,
      endpoint: GRAPHQL_ENDPOINT
    }))
  }

  const server = createServer(app)

  new SubscriptionServer(
    { execute, subscribe, schema },
    { server, path: SUBSCRIPTIONS_PATH }
  )

  echo.installHandlers(server, { prefix: SOCKJS_ENDPOINT })

  server.listen(port, () => {
    if (ui) {
      const url = chalk.blue.bold(`http://localhost:${port}${EXPLORE_ENDPOINT}`)
      info(`Explore data at ${url}`)
    }

    portfinder.basePort = 8000

    resolve({
      sockjsEndpoint: `http://localhost:${port}${SOCKJS_ENDPOINT}`,
      gqlEndpoint: `http://localhost:${port}${GRAPHQL_ENDPOINT}`,
      wsEndpoint: `ws://localhost:${port}${GRAPHQL_ENDPOINT}`
    })
  })
})
