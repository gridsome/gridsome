const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('../../graphql')

const { pageInfoType, sortOrderType } = require('../types')

const count = (nodes, type) => nodes.find({ type }).length

module.exports = ({ contentType, nodeType, source }) => {
  const edgeType = new GraphQLObjectType({
    name: `${contentType.type}Edge`,
    fields: () => ({
      node: { type: nodeType },
      next: { type: nodeType },
      previous: { type: nodeType }
    })
  })

  const connectionType = new GraphQLObjectType({
    name: `${contentType.type}Connection`,
    fields: () => ({
      totalCount: { type: GraphQLInt },
      pageInfo: { type: new GraphQLNonNull(pageInfoType) },
      edges: { type: new GraphQLList(edgeType) }
    })
  })

  return {
    type: connectionType,
    description: `Connection to all ${contentType.type} nodes`,
    args: {
      sortBy: { type: GraphQLString, defaultValue: 'created' },
      order: { type: sortOrderType, defaultValue: -1 },
      perPage: { type: GraphQLInt, defaultValue: 25 },
      skip: { type: GraphQLInt, defaultValue: 0 },
      page: { type: GraphQLInt, defaultValue: 1 }
    },
    async resolve (_, { sortBy, order, perPage, skip, page }) {
      page = Math.max(page, 1) // ensure page higher than 0
      perPage = Math.max(perPage, 1) // ensure page higher than 1

      const query = source.nodes
        .chain()
        .find({ type: contentType.type })
        .simplesort(sortBy, order === -1)
        .offset(((page - 1) * perPage) + skip)
        .limit(perPage)

      const nodes = query.data()
      const totalStoreNodes = count(source.nodes, contentType.type)

      // total items in result
      const totalCount = Math.max(totalStoreNodes - skip, 0)

      // page info
      const currentPage = page
      const totalPages = Math.max(Math.ceil(totalCount / perPage), 1)
      const isLast = page >= totalPages
      const isFirst = page <= 1

      return {
        totalCount,
        edges: nodes.map((node, index) => ({
          node,
          next: nodes[index + 1],
          previous: nodes[index - 1]
        })),
        pageInfo: {
          currentPage,
          totalPages,
          isFirst,
          isLast
        }
      }
    }
  }
}
