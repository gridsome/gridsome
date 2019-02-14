const { createPagedNodeEdges } = require('./utils')
const { PER_PAGE } = require('../../utils/constants')
const { pageInfoType, sortOrderType } = require('../types')
const { createFilterTypes, createFilterQuery } = require('../createFilterTypes')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType
} = require('graphql')

module.exports = ({ nodeType, fields }) => {
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

  const connectionArgs = {
    sortBy: { type: GraphQLString, defaultValue: 'date' },
    order: { type: sortOrderType, defaultValue: 'DESC' },
    perPage: { type: GraphQLInt, defaultValue: PER_PAGE },
    skip: { type: GraphQLInt, defaultValue: 0 },
    page: { type: GraphQLInt, defaultValue: 1 },

    // TODO: remove before 1.0
    regex: { type: GraphQLString, deprecationReason: 'Use filter instead.' }
  }

  connectionArgs.filter = {
    description: `Filter for ${nodeType.name} nodes.`,
    type: new GraphQLInputObjectType({
      name: `${nodeType.name}Filters`,
      fields: createFilterTypes({
        ...fields,
        id: '',
        title: '',
        slug: '',
        path: '',
        content: '',
        excerpt: '',
        date: '2019-01-03'
      }, `${nodeType.name}Filter`)
    })
  }

  return {
    type: connectionType,
    args: connectionArgs,
    description: `Connection to all ${nodeType.name} nodes`,
    async resolve (_, { regex, filter, ...args }, { store }, info) {
      const { collection } = store.getContentType(nodeType.name)
      const query = {}

      if (regex) {
        // TODO: remove before 1.0
        query.path = { $regex: new RegExp(regex) }
      }

      if (filter) {
        const fields = connectionArgs.filter.type.getFields()
        Object.assign(query, createFilterQuery(filter, fields))
      }

      const chain = collection.chain().find(query)

      return createPagedNodeEdges(chain, args)
    }
  }
}
