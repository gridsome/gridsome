const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { chalk } = require('@vue/cli-shared-utils')
const { default: playground } = require('graphql-playground-middleware-express')
const { trim } = require('lodash')

const endpoints = {
  graphql: '/___graphql',
  explore: '/___explore',
  sockjs: '/echo'
}

module.exports = (app, schema, store) => {
  app.use(
    endpoints.graphql,
    bodyParser.json(),
    graphqlHTTP({ schema, context: { store }})
  )

  app.get(endpoints.explore, playground({
    endpoint: endpoints.graphql
  }))

  return ({ url }) => {
    const exploreUrl = `${trim(url, '/')}${endpoints.explore}`
    console.log(`  Explore GraphQL data at: ${chalk.cyan(exploreUrl)}`)
  }
}

module.exports.endpoints = endpoints
