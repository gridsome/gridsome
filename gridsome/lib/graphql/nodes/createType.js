const graphql = require('../graphql')
const { nodeInterface } = require('../interfaces')
const createBelongsTo = require('./createBelongsTo')
const { createRefResolver } = require('../resolvers')
const { createFieldTypes, createRefType } = require('../createFieldTypes')
const { mapValues, isEmpty } = require('lodash')

const {
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = graphql

module.exports = ({ contentType, nodeTypes, fields }) => {
  const nodeType = new GraphQLObjectType({
    name: contentType.typeName,
    interfaces: [nodeInterface],
    isTypeOf: node => node.internal.typeName === contentType.typeName,
    fields: () => {
      const fieldTypes = createFieldTypes(fields, contentType.typeName, nodeTypes)
      const refs = createRefs(contentType, nodeTypes, fieldTypes)

      const nodeFields = {
        ...fieldTypes,
        ...refs,

        ...extendNodeType(contentType, nodeType, nodeTypes),
        ...createFields(contentType, fieldTypes),

        id: { type: new GraphQLNonNull(GraphQLID) },
        belongsTo: createBelongsTo(contentType, nodeTypes),

        _id: {
          deprecationReason: 'Use id instead.',
          type: new GraphQLNonNull(GraphQLID),
          resolve: node => node.id
        }
      }

      return nodeFields
    }
  })

  return nodeType
}

function extendNodeType (contentType, nodeType, nodeTypes) {
  const context = { contentType, nodeTypes, nodeType, graphql }
  const fields = {}

  for (const mimeType in contentType.options.mimeTypes) {
    const transformer = contentType.options.mimeTypes[mimeType]
    if (typeof transformer.extendNodeType === 'function') {
      Object.assign(fields, transformer.extendNodeType(context))
    }
  }

  for (const fieldName in contentType.options.fields) {
    const field = contentType.options.fields[fieldName]
    if (typeof field === 'function') {
      fields[fieldName] = field(context)
    }
  }

  return fields
}

function createFields (contentType, customFields) {
  if (isEmpty(customFields)) return {}

  const fields = {
    resolve: obj => obj,
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
            id: obj[fieldName]
          }
        }

        return resolve(field, args, context, info)
      }
    }
  })
}
