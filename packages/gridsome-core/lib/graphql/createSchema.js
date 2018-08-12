const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = service => {
  const createPagesSchema = require('./schema/pages')
  const createNodesSchema = require('./schema/nodes')
  const createInternalSchema = require('./schema/internal')
  const directives = require('./schema/directives')

  const pagesSchema = createPagesSchema(service.pages)
  const nodesSchema = createNodesSchema(service.sources)
  const internalSchema = createInternalSchema()

  service.schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        ...pagesSchema.queries,
        ...pagesSchema.connections,
        ...nodesSchema.queries,
        ...nodesSchema.connections,
        ...internalSchema.queries,
        ...internalSchema.connections
      }
    }),
    directives: [
      ...directives
    ]
  })
}
