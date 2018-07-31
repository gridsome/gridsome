const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

const createPagesSchema = require('./schema/pages')
const createNodesSchema = require('./schema/nodes')
const createInternalSchema = require('./schema/internal')

module.exports = service => {
  const pagesSchema = createPagesSchema(service.pages)
  const nodesSchema = createNodesSchema(service.sources)
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

    // mutation: new GraphQLObjectType({
    //   name: 'RootMutation',
    //   fields: {
    //     ...pagesSchema.mutations,
    //     ...nodesSchema.mutations,
    //     ...internalSchema.mutations
    //   }
    // }),

    // subscription: new GraphQLObjectType({
    //   name: 'RootSubscription',
    //   fields: {
    //     ...pagesSchema.subscriptions,
    //     ...nodesSchema.subscriptions,
    //     ...internalSchema.subscriptions
    //   }
    // })
  })
}
