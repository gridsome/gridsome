const { mergeSchemas } = require('graphql-tools')

const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = (store, options = {}) => {
  const directives = require('./schema/directives')
  const pagesSchema = require('./schema/pages')()
  const nodesSchema = require('./schema/nodes')(store)
  const { schemas = [] } = options

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQuery',
      fields: {
        ...pagesSchema.queries,
        ...nodesSchema.queries,
        ...pagesSchema.connections,
        ...nodesSchema.connections
      }
    }),
    directives
  })

  return mergeSchemas({
    schemas: [schema, ...schemas]
  })
}
