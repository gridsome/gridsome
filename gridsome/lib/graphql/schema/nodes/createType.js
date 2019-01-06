const graphql = require('../../graphql')
const { dateType } = require('../types/date')
const { mapValues, isEmpty, uniqBy } = require('lodash')
const { nodeInterface } = require('../interfaces')
const { createRefResolver } = require('../resolvers')
const { sortOrderType } = require('../types')
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

module.exports = ({ contentType, nodeTypes, fields }) => {
  const belongsToType = new GraphQLUnionType({
    interfaces: [nodeInterface],
    name: `${contentType.typeName}BackRefs`,
    types: () => Object.keys(nodeTypes).map(typeName => nodeTypes[typeName])
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

        edges: {
          type: new GraphQLList(belongsToType),
          args: {
            sortBy: { type: GraphQLString, defaultValue: 'date' },
            order: { type: sortOrderType, defaultValue: 'DESC' },
            perPage: { type: GraphQLInt, defaultValue: 25 },
            skip: { type: GraphQLInt, defaultValue: 0 },
            page: { type: GraphQLInt, defaultValue: 1 },
            regex: { type: GraphQLString }
          },
          resolve (node, args, { store }) {
            let chain = store.index.chain().find({
              [`belongsTo.${node.typeName}`]: { $in: node.id }
            })

            const typeNames = uniqBy(chain.data(), 'typeName').map(entry => entry.typeName)
            const mapper = (left, right) => ({ ...left, ...right })
            const options = { removeMeta: true }

            for (let i = 0, l = typeNames.length; i < l; i++) {
              const { collection } = store.getContentType(typeNames[i])
              chain = chain.eqJoin(collection, 'uid', 'uid', mapper, options)
            }

            return chain.data()
          }
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
