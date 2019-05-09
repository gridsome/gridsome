const { mapValues, values } = require('lodash')
const { nodeInterface } = require('../interfaces')
const { PER_PAGE, SORT_ORDER } = require('../../utils/constants')
const { pageInfoType, sortOrderType, sortType } = require('../types')

const {
  createPagedNodeEdges,
  createBelongsToKey,
  createSortOptions
} = require('./utils')

const {
  createFilterTypes,
  createFilterQuery
} = require('../createFilterTypes')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInputObjectType
} = require('graphql')

module.exports = function createBelongsTo (contentType, nodeTypes) {
  const belongsToUnionType = new GraphQLUnionType({
    interfaces: [nodeInterface],
    name: `${contentType.typeName}BelongsToUnion`,
    types: () => values(nodeTypes)
  })

  const belongsToEdgeType = new GraphQLObjectType({
    name: `${contentType.typeName}BelongsToEdge`,
    fields: () => ({
      node: { type: belongsToUnionType },
      next: { type: belongsToUnionType },
      previous: { type: belongsToUnionType }
    })
  })

  const belongsToType = new GraphQLObjectType({
    name: `${contentType.typeName}BelongsTo`,
    fields: () => ({
      totalCount: { type: GraphQLInt },
      pageInfo: { type: new GraphQLNonNull(pageInfoType) },
      edges: { type: new GraphQLList(belongsToEdgeType) }
    })
  })

  const typeNameEnum = new GraphQLEnumType({
    name: `${contentType.typeName}BelongsToTypeNameEnum`,
    values: mapValues(nodeTypes, (_, typeName) => {
      return {
        value: typeName
      }
    })
  })

  const belongsToArgs = {
    sortBy: { type: GraphQLString, defaultValue: 'date' },
    order: { type: sortOrderType, defaultValue: SORT_ORDER },
    perPage: { type: GraphQLInt, description: `Defaults to ${PER_PAGE} when page is provided.` },
    skip: { type: GraphQLInt, defaultValue: 0 },
    limit: { type: GraphQLInt },
    page: { type: GraphQLInt },
    sort: { type: new GraphQLList(sortType) }
  }

  const filterPrefix = `${contentType.typeName}BelongsToFilter`
  const filterArgs = createFilterTypes({ id: '', path: '' }, filterPrefix)

  belongsToArgs.filter = {
    description: `Filter for ${contentType.typeName} nodes.`,
    type: new GraphQLInputObjectType({
      name: `${contentType.typeName}BelongsToFilters`,
      fields: {
        ...filterArgs,
        typeName: {
          type: new GraphQLInputObjectType({
            name: `${filterPrefix}TypeName`,
            description: 'Filter nodes by typeName.',
            fields: {
              eq: { type: typeNameEnum },
              ne: { type: typeNameEnum },
              regex: { type: GraphQLString },
              in: { type: new GraphQLList(typeNameEnum) },
              nin: { type: new GraphQLList(typeNameEnum) }
            }
          })
        }
      }
    })
  }

  return {
    type: belongsToType,
    args: belongsToArgs,
    resolve (node, { filter, ...args }, { store }) {
      const key = createBelongsToKey(node)
      const sort = createSortOptions(args)
      const query = { [key]: { $eq: true }}

      if (filter) {
        const fields = belongsToArgs.filter.type.getFields()
        Object.assign(query, createFilterQuery(filter, fields))
      }

      const chain = store.chainIndex(query)

      return createPagedNodeEdges(chain, args, sort)
    }
  }
}
