const graphql = require('graphql')
const GraphQLJSON = require('graphql-type-json')
const { PubSub } = require('graphql-subscriptions')

const pubsub = new PubSub()

module.exports = { ...graphql, pubsub, GraphQLJSON }
