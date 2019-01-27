const { omitBy, isEmpty } = require('lodash')
const { mergeSchemas } = require('graphql-tools')

const {
  GraphQLSchema,
  GraphQLObjectType
} = require('./graphql')

module.exports = (store, options = {}) => {
  const directives = require('./schema/directives')
  const pagesSchema = require('./schema/pages')()
  const nodesSchema = require('./schema/nodes')(store)
  const metaData = require('./schema/metaData')(store, nodesSchema.nodeTypes)
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
