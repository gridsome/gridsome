const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = (store, options = {}) => {
  const directives = require('./schema/directives')
  const pagesSchema = require('./schema/pages')()
  const nodesSchema = require('./schema/nodes')(store)

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        ...options.queries,
        ...pagesSchema.queries,
        ...nodesSchema.queries,
        ...pagesSchema.connections,
        ...nodesSchema.connections
      }
    }),
    directives
  })
}
