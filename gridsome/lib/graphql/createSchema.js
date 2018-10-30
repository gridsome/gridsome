const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = store => {
  const directives = require('./schema/directives')
  const pagesSchema = require('./schema/pages')()
  const nodesSchema = require('./schema/nodes')(store)

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

  // TODO: merge schemas once query directives are working in
  // graphql-tools or Gridsome has found another way to figure out
  // pagination etc...

  return schema
}
