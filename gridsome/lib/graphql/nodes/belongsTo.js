const { ObjectTypeComposer } = require('graphql-compose')
const { PER_PAGE, SORT_ORDER } = require('../../utils/constants')
const { createFilterInput } = require('../filters/input')
const { toFilterArgs } = require('../filters/query')
const { safeKey } = require('../../utils')

const {
  createSortOptions,
  createPagedNodeEdges
} = require('./utils')

exports.createBelongsToKey = function (node) {
  return `belongsTo.${node.internal.typeName}.${safeKey(node.id)}`
}

exports.createBelongsTo = function (schemaComposer, store) {
  schemaComposer.createObjectTC({
    name: 'NodeBelongsToEdge',
    interfaces: ['NodeConnectionEdge'],
    fields: {
      node: 'Node',
      next: 'Node',
      previous: 'Node'
    }
  })

  schemaComposer.createObjectTC({
    name: 'NodeBelongsTo',
    interfaces: ['NodeConnection'],
    fields: {
      totalCount: 'Int!',
      pageInfo: 'PageInfo!',
      edges: ['NodeBelongsToEdge']
    }
  })

  for (const typeName in store.collections) {
    const typeComposer = schemaComposer.get(typeName)
    const filterTypeComposer = createFilterComposer(schemaComposer)

    const belongsToArgs = {
      sortBy: { type: 'String', defaultValue: 'date' },
      order: { type: 'SortOrder', defaultValue: SORT_ORDER },
      perPage: { type: 'Int', description: `Defaults to ${PER_PAGE} when page is provided.` },
      skip: { type: 'Int', defaultValue: 0 },
      limit: { type: 'Int' },
      page: { type: 'Int' },
      sort: '[SortArgument!]',
      filter: filterTypeComposer
    }

    const belongsTo = {
      type: 'NodeBelongsTo',
      args: belongsToArgs,
      resolve (node, { filter, ...args }, { store }) {
        const key = exports.createBelongsToKey(node)
        const sort = createSortOptions(args)
        const query = { [key]: { $eq: true }}

        if (filter) {
          Object.assign(query, toFilterArgs(filter, filterTypeComposer))
        }

        const chain = store.chainIndex(query)

        return createPagedNodeEdges(chain, args, sort)
      }
    }

    typeComposer.addFields({ belongsTo })
  }
}

function createFilterComposer (schemaComposer) {
  const typeComposer = ObjectTypeComposer.createTemp({
    name: 'BelongsTo',
    fields: {
      id: 'ID',
      path: 'String',
      typeName: 'TypeName'
    }
  }, schemaComposer)

  return createFilterInput(schemaComposer, typeComposer)
}
