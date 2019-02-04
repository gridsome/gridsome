const { createPagedNodeEdges } = require('./utils')
const { PER_PAGE } = require('../../../utils/constants')
const { pageInfoType, sortOrderType } = require('../types')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('../../graphql')

module.exports = nodeType => {
  const edgeType = new GraphQLObjectType({
    name: `${nodeType.name}Edge`,
    fields: () => ({
      node: { type: nodeType },
      next: { type: nodeType },
      previous: { type: nodeType }
    })
  })

  const connectionType = new GraphQLObjectType({
    name: `${nodeType.name}Connection`,
    fields: () => ({
      totalCount: { type: GraphQLInt },
      pageInfo: { type: new GraphQLNonNull(pageInfoType) },
      edges: { type: new GraphQLList(edgeType) }
    })
  })

  return {
    type: connectionType,
    description: `Connection to all ${nodeType.name} nodes`,
    args: {
      sortBy: { type: GraphQLString, defaultValue: 'date' },
      order: { type: sortOrderType, defaultValue: 'DESC' },
      perPage: { type: GraphQLInt, defaultValue: PER_PAGE },
      skip: { type: GraphQLInt, defaultValue: 0 },
      page: { type: GraphQLInt, defaultValue: 1 },
      regex: { type: GraphQLString }
    },
    async resolve (_, { regex, ...args }, { store }, info) {
      const { collection } = store.getContentType(nodeType.name)
      const query = regex ? { path: { $regex: new RegExp(regex) }} : {}

      const chain = collection.chain().find(query)

      return createPagedNodeEdges(chain, args)
    }
  }
}
