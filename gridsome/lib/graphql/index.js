const graphql = require('graphql')
const parseQuery = require('./parseQuery')
const createSchema = require('./createSchema')
const { GraphQLJSON } = require('graphql-compose')
const { toFilterArgs } = require('./filters/query')
const { createBelongsToKey } = require('./nodes/belongsTo')
const { createPagedNodeEdges } = require('./nodes/utils')

module.exports = {
  ...graphql,
  GraphQLJSON,
  createSchema,
  parseQuery,
  toFilterArgs,
  createBelongsToKey,
  createPagedNodeEdges
}
