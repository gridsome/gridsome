const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('../../graphql')

const { pageInfoType, sortOrderType } = require('../types')

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
      perPage: { type: GraphQLInt, defaultValue: 25 },
      skip: { type: GraphQLInt, defaultValue: 0 },
      page: { type: GraphQLInt, defaultValue: 1 },
      regex: { type: GraphQLString }
    },
    async resolve (_, { sortBy, order, perPage, skip, page, regex }, { store }, info) {
      page = Math.max(page, 1) // ensure page higher than 0
      perPage = Math.max(perPage, 1) // ensure page higher than 1

      const { collection } = store.getContentType(nodeType.name)
      const query = {}

      if (regex) {
        query.path = { $regex: new RegExp(regex) }
      }

      const results = collection
        .chain()
        .find(query)
        .simplesort(sortBy, order === 'DESC')
        .offset(((page - 1) * perPage) + skip)
        .limit(perPage)

      const nodes = results.data()
      const totalNodes = collection.find({}).length

      // total items in result
      const totalCount = Math.max(totalNodes - skip, 0)

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
