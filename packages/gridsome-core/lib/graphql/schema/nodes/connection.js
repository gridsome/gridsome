const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('../../graphql')

const { pageInfoType, sortOrderType } = require('../types')

const count = (nodes, type) => new Promise((resolve, reject) => {
  nodes.count({ type }, (err, count) => {
    if (err) reject(err)
    else resolve(count)
  })
})

const exec = (query) => new Promise((resolve, reject) => {
  query.exec((err, nodes) => {
    if (err) return reject(err)

    resolve(
      nodes.map((node, index) => {
        return {
          node,
          next: nodes[index + 1],
          previous: nodes[index - 1]
        }
      })
    )
  })
})

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
      sortBy: { type: GraphQLString },
      order: { type: sortOrderType },
      perPage: { type: GraphQLInt },
      skip: { type: GraphQLInt },
      page: { type: GraphQLInt }
    },
    async resolve (_, {
      sortBy = 'created',
      order = -1,
      perPage = 25,
      skip = 0,
      page = 1
    }) {
      const query = source.nodes.find({
        type: contentType.type
      })

      page = Math.max(page, 1) // ensure page higher than 0

      query.sort({ [sortBy]: order })
      query.skip(((page - 1) * perPage) + skip)
      query.limit(perPage)

      const edges = await exec(query)
      const totalStoreNodes = await count(source.nodes, contentType.type)

      // total items in result
      const totalCount = Math.max(totalStoreNodes - skip, 0)

      // page info
      const currentPage = page
      const totalPages = Math.max(Math.ceil(totalCount / perPage), 1)
      const isLast = page >= totalPages
      const isFirst = page <= 1

      return {
        edges,
        totalCount,
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
