const graphql = require('../../graphql')
const { dateType } = require('../types/date')
const { nodeInterface } = require('../interfaces')
const { createPagedNodeEdges } = require('./utils')
const { createRefResolver } = require('../resolvers')
const { mapValues, isEmpty, values } = require('lodash')
const { pageInfoType, sortOrderType } = require('../types')
const { createFieldTypes, createRefType } = require('../createFieldTypes')

const {
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLUnionType,
  GraphQLObjectType
} = graphql

module.exports = ({ contentType, nodeTypes, fields, typeNameEnum }) => {
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

  const nodeType = new GraphQLObjectType({
    name: contentType.typeName,
    description: contentType.description,
    interfaces: [nodeInterface],
    isTypeOf: node => node.typeName === contentType.typeName,
    fields: () => {
      const fieldTypes = createFieldTypes(fields, contentType.typeName, nodeTypes)
      const refs = createRefs(contentType, nodeTypes, fieldTypes)

      const nodeFields = {
        ...fieldTypes,
        ...refs,

        content: { type: GraphQLString },
        excerpt: { type: GraphQLString },

        ...extendNodeType(contentType, nodeType, nodeTypes),
        ...createFields(contentType, fieldTypes),

        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        slug: { type: GraphQLString },
        path: { type: GraphQLString },
        date: dateType,

        belongsTo: {
          type: belongsToType,
          args: {
            types: { type: new GraphQLList(typeNameEnum) },
            sortBy: { type: GraphQLString, defaultValue: 'date' },
            order: { type: sortOrderType, defaultValue: 'DESC' },
            perPage: { type: GraphQLInt, defaultValue: 25 },
            skip: { type: GraphQLInt, defaultValue: 0 },
            page: { type: GraphQLInt, defaultValue: 1 },
            regex: { type: GraphQLString }
          },
          resolve: belongsToResolver
        },

        _id: {
          deprecationReason: 'Use node.id instead.',
          type: new GraphQLNonNull(GraphQLID),
          resolve: node => node.id
        }
      }

      if (!isEmpty(refs)) {
        nodeFields.refs = {
          resolve: obj => obj,
          deprecationReason: 'Use ref on node instead.',
          type: new GraphQLObjectType({
            name: `${contentType.typeName}References`,
            fields: () => refs
          })
        }
      }

      return nodeFields
    }
  })

  return nodeType
}

function belongsToResolver (node, { types, regex, ...args }, { store }) {
  const key = `belongsTo.${node.typeName}.${node.id}`
  const query = { [key]: { $eq: true }}

  if (types) query.typeName = { $in: types }
  if (regex) query.path = { $regex: new RegExp(regex) }

  const chain = store.chainIndex(query)

  return createPagedNodeEdges(chain, args)
}

function extendNodeType (contentType, nodeType, nodeTypes) {
  const payload = { contentType, nodeTypes, nodeType, graphql }
  const fields = {}

  for (const mimeType in contentType.options.mimeTypes) {
    const transformer = contentType.options.mimeTypes[mimeType]
    if (typeof transformer.extendNodeType === 'function') {
      Object.assign(fields, transformer.extendNodeType(payload))
    }
  }

  for (const fieldName in contentType.options.fields) {
    const field = contentType.options.fields[fieldName]
    if (typeof field === 'function') {
      fields[fieldName] = field(payload)
    }
  }

  return fields
}

function createFields (contentType, customFields) {
  if (isEmpty(customFields)) return {}

  const fields = {
    deprecationReason: 'Get field on node instead.',
    type: new GraphQLObjectType({
      name: `${contentType.typeName}Fields`,
      fields: () => customFields
    })
  }

  return { fields }
}

function createRefs (contentType, nodeTypes, fields) {
  if (isEmpty(contentType.options.refs)) return null

  return mapValues(contentType.options.refs, ({ typeName }, fieldName) => {
    const field = fields[fieldName] || { type: GraphQLString }
    const isList = field.type instanceof GraphQLList
    const ref = { typeName, isList }
    const resolve = createRefResolver(ref)

    return {
      ...createRefType(ref, fieldName, contentType.typeName, nodeTypes),
      resolve: (obj, args, context, info) => {
        const field = {
          [fieldName]: {
            typeName,
            id: obj.fields[fieldName]
          }
        }

        return resolve(field, args, context, info)
      }
    }
  })
}
