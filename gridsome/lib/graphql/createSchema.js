const { omitBy, isEmpty } = require('lodash')
const { mergeSchemas } = require('graphql-tools')
const { GraphQLSchema, GraphQLObjectType } = require('graphql')

module.exports = (store, options = {}) => {
  const directives = require('./directives')
  const pagesSchema = require('./pages')()
  const nodesSchema = require('./nodes')(store)
  const metaData = require('./metaData')(store, nodesSchema.nodeTypes)
  const { schemas = [] } = options

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: () => omitBy({
        ...pagesSchema.queries,
        ...nodesSchema.queries,
        ...pagesSchema.connections,
        ...nodesSchema.connections,
        metaData
      }, isEmpty)
    }),
    directives
  })

  return mergeSchemas({
    schemas: [schema, ...schemas]
  })
}
