const { omitBy, isEmpty } = require('lodash')
const { GraphQLSchema, GraphQLObjectType } = require('graphql')

module.exports = store => {
  const directives = require('./directives')
  const pagesSchema = require('./pages')()
  const nodesSchema = require('./nodes')(store)
  const metaData = require('./metaData')(store, nodesSchema.nodeTypes)

  return new GraphQLSchema({
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
}
