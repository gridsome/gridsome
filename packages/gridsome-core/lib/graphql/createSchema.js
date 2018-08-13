const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = service => {
  const createPagesSchema = require('./schema/pages')
  const createNodesSchema = require('./schema/nodes')
  const createInternalSchema = require('./schema/internal')
  const directives = require('./schema/directives')

  const internalSchema = createInternalSchema()
  const pagesSchema = createPagesSchema(service.pages)
  const nodesSchema = createNodesSchema(
    service.config.plugins.filter(p => p.isSource)
  )

  service.schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        ...nodesSchema.queries,
        ...pagesSchema.queries,
        ...pagesSchema.connections,
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
