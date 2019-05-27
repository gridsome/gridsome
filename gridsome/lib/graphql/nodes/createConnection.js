const { PER_PAGE } = require('../../utils/constants')
const { pageInfoType, sortOrderType, sortType } = require('../types')
const { createFilterTypes, createFilterQuery } = require('../createFilterTypes')
const { createPagedNodeEdges, createSortOptions } = require('./utils')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType
} = require('graphql')

module.exports = ({ contentType, nodeType, fields }) => {
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

  const { defaultSortBy, defaultSortOrder } = contentType.options

  const connectionArgs = {
    sortBy: { type: GraphQLString, defaultValue: defaultSortBy },
    order: { type: sortOrderType, defaultValue: defaultSortOrder },
    perPage: { type: GraphQLInt, description: `Defaults to ${PER_PAGE} when page is provided.` },
    skip: { type: GraphQLInt, defaultValue: 0 },
    limit: { type: GraphQLInt },
    page: { type: GraphQLInt },
    sort: { type: new GraphQLList(sortType) },

    // TODO: remove before 1.0
    regex: { type: GraphQLString, deprecationReason: 'Use filter instead.' }
  }

  connectionArgs.filter = {
    description: `Filter for ${nodeType.name} nodes.`,
    type: new GraphQLInputObjectType({
      name: `${nodeType.name}Filters`,
      fields: createFilterTypes({ ...fields, id: '' }, `${nodeType.name}Filter`)
    })
  }

  return {
    type: connectionType,
    args: connectionArgs,
    description: `Connection to all ${nodeType.name} nodes`,
    async resolve (_, { regex, filter, ...args }, { store }) {
      const { collection } = store.getContentType(nodeType.name)
      const sort = createSortOptions(args)
      const query = {}

      for (const [fieldName] of sort) {
        collection.ensureIndex(fieldName)
      }

      if (regex) {
        // TODO: remove before 1.0
        query.path = { $regex: new RegExp(regex) }
      }

      if (filter) {
        const fields = connectionArgs.filter.type.getFields()
        Object.assign(query, createFilterQuery(filter, fields))
      }

      const chain = collection.chain().find(query)

      return createPagedNodeEdges(chain, args, sort)
    }
  }
}
