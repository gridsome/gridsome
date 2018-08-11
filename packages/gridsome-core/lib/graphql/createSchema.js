const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = ({ pages, sources }) => {
  const createPagesSchema = require('./schema/pages')
  const createNodesSchema = require('./schema/nodes')
  const createInternalSchema = require('./schema/internal')
  const directives = require('./schema/directives')

  const pagesSchema = createPagesSchema(pages)
  const nodesSchema = createNodesSchema(sources)
  const internalSchema = createInternalSchema()

  return new GraphQLSchema({
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
