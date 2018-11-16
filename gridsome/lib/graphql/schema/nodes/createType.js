const camelCase = require('camelcase')
const inferTypes = require('../infer-types')
const { dateType } = require('../types/date')
const { mapValues, isEmpty } = require('lodash')
const { refResolver } = require('../resolvers')

const { nodeInterface } = require('../interfaces')

const {
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType
} = require('../../graphql')

module.exports = ({ contentType, nodeTypes }) => {
  const nodeType = new GraphQLObjectType({
    name: contentType.typeName,
    description: contentType.description,
    interfaces: [nodeInterface],
    isTypeOf: node => node.typeName === contentType.typeName,
    fields: () => {
      const nodes = contentType.collection.find()
      const fields = inferTypes(nodes, contentType.typeName, nodeTypes)
      const refs = createRefs(contentType, nodeTypes, fields)

      const nodeFields = {
        ...fields,
        ...refs,

        content: { type: GraphQLString },
        excerpt: { type: GraphQLString },

        ...extendNodeType(contentType, nodeType, nodeTypes),
        ...createFields(contentType, fields),

        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        slug: { type: GraphQLString },
        path: { type: GraphQLString },
        date: dateType,

        _id: {
          deprecationReason: 'Use node.id instead.',
          type: new GraphQLNonNull(GraphQLID),
          resolve: node => node.id
        },
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
  const fields = {}

  for (const mimeType in contentType.options.mimeTypes) {
    const transformer = contentType.options.mimeTypes[mimeType]
    if (typeof transformer.extendNodeType === 'function') {
      Object.assign(fields, transformer.extendNodeType({
        contentType,
        nodeTypes,
        nodeType
      }))
    }
  }

  for (const fieldName in contentType.options.fields) {
    const field = contentType.options.fields[fieldName]
    if (typeof field === 'function') {
      fields[fieldName] = field({
        contentType,
        nodeTypes,
        nodeType
      })
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

  return mapValues(contentType.options.refs, (ref, key) => {
    const { typeName, description } = ref
    const field = fields[key] || { type: GraphQLString }

    const isList = field.type instanceof GraphQLList
    let refType = nodeTypes[typeName]

    if (Array.isArray(typeName)) {
      // TODO: create union collection
      const fieldTypeName = camelCase(key, { pascalCase: true })
      refType = new GraphQLUnionType({
        name: `${contentType.typeName}${fieldTypeName}Union`,
        interfaces: [nodeInterface],
        types: typeName.map(typeName => nodeTypes[typeName])
      })
    }

    return {
      description,
      type: isList ? new GraphQLList(refType) : refType,
      resolve: (obj, args, context, info) => {
        const field = {
          [info.fieldName]: {
            typeName,
            key: ref.key,
            value: obj.fields[key]
          }
        }

        return refResolver(field, args, context, info)
      }
    }
  })
}
