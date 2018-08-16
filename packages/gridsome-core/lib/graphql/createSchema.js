const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

const { SOURCE_PLUGIN } = require('../utils/enums')

module.exports = service => {
  const createPagesSchema = require('./schema/pages')
  const createNodesSchema = require('./schema/nodes')
  const createInternalSchema = require('./schema/internal')
  const directives = require('./schema/directives')

  const internalSchema = createInternalSchema()
  const pagesSchema = createPagesSchema(service.pages)
  const nodesSchema = createNodesSchema(
    service.config.plugins.filter(p => p.type === SOURCE_PLUGIN)
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
