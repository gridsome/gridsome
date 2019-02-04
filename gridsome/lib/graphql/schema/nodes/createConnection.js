const { pick, omit, reduce } = require('lodash')
const { createPagedNodeEdges } = require('./utils')
const { PER_PAGE } = require('../../../utils/constants')
const { pageInfoType, sortOrderType } = require('../types')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType
} = require('../../graphql')

const {
  createFilterTypes,
  GraphQLInputFilterObjectType,
  GraphQLInputFilterReferenceType
} = require('../createFilterTypes')

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
    regex: { type: GraphQLString, deprecationReason: 'Use filter argument instead.' }
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
      }, nodeType.name)
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
        const internals = ['id', 'title', 'date', 'slug', 'path', 'content', 'excerpt']

        Object.assign(query, toFilterArgs(omit(filter, internals), connectionArgs.filter, 'fields'))
        Object.assign(query, toFilterArgs(pick(filter, internals), connectionArgs.filter))
      }

      const chain = collection.chain().find(query)

      return createPagedNodeEdges(chain, args)
    }
  }
}

function toFilterArgs (input, filters, current = '') {
  const fields = filters.type.getFields()
  const result = {}

  for (const key in input) {
    const newKey = current ? `${current}.${key}` : key
    const value = input[key]

    if (value === undefined) continue

    if (fields[key].type instanceof GraphQLInputFilterObjectType) {
      result[newKey] = convertFilterValues(value)
    } else if (fields[key].type instanceof GraphQLInputFilterReferenceType) {
      result[`${newKey}.id`] = convertFilterValues(value)
    } else {
      Object.assign(result, toFilterArgs(value, fields[key], newKey))
    }
  }

  return result
}

function convertFilterValues (value) {
  return reduce(value, (acc, value, key) => {
    const filterKey = `$${key}`

    if (key === 'regex') acc[filterKey] = new RegExp(value)
    else acc[filterKey] = value

    return acc
  }, {})
}
