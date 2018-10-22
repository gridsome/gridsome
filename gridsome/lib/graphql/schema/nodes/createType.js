const camelCase = require('camelcase')
const { dateType } = require('../types/date')
const { mapValues, isEmpty } = require('lodash')

const { internalType } = require('../types')
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

const fieldsInterface = new GraphQLInterfaceType({
  name: 'FieldsInterface',
  fields: () => ({
    title: { type: GraphQLString }
  })
})

module.exports = ({ contentType, nodeTypes, fields }) => {
  const nodeType = new GraphQLObjectType({
    name: contentType.typeName,
    description: contentType.description,
    interfaces: [nodeInterface],
    isTypeOf: node => node.typeName === contentType.typeName,
    fields: () => ({
      _id: { type: new GraphQLNonNull(GraphQLID) },
      type: { type: new GraphQLNonNull(GraphQLString) },
      internal: { type: new GraphQLNonNull(internalType) },
      title: { type: GraphQLString },
      slug: { type: GraphQLString },
      path: { type: GraphQLString },
      content: { type: GraphQLString },
      date: dateType,

      ...extendNodeType(contentType, nodeType),
      ...createFields(contentType, fields),
      ...createRefs(contentType, nodeTypes, fields),
      ...createBelongsToRefs(contentType, nodeTypes)
    })
  })

  return nodeType
}

function extendNodeType (contentType, nodeType) {
  const fields = {}

  for (const mimeType in contentType.options.mimeTypes) {
    const transformer = contentType.options.mimeTypes[mimeType]
    if (typeof transformer.extendNodeType === 'function') {
      Object.assign(fields, transformer.extendNodeType({
        contentType,
        nodeType
      }))
    }
  }

  return fields
}

function createFields (contentType, customFields) {
  const fields = {
    type: new GraphQLObjectType({
      name: `${contentType.typeName}Fields`,
      interfaces: [fieldsInterface],
      fields: {
        title: { type: GraphQLString },
        ...customFields
      }
    })
  }

  return { fields }
}

function createRefs (contentType, nodeTypes, fields) {
  if (isEmpty(contentType.options.refs)) return null

  const refs = {
    resolve: obj => obj,
    type: new GraphQLObjectType({
      name: `${contentType.typeName}References`,
      fields: () => mapValues(contentType.options.refs, (ref, key) => {
        const { typeName, description } = ref

        if (!fields.hasOwnProperty(key)) {
          throw new Error(
            `${contentType.typeName} cannot create reference to ` +
            `${typeName} because it does not have the field ${key}.`
          )
        }

        const isList = fields[key].type instanceof GraphQLList
        let refType = nodeTypes[typeName]

        if (Array.isArray(typeName)) {
          refType = new GraphQLList(refType)

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
          resolve: (obj, args, { store }) => {
            const $in = obj.fields[key] || []
            const query = { [ref.key]: { $in }}

            if (Array.isArray(typeName)) {
              // TODO: search multiple collections
              return []
            }

            const { collection } = store.getContentType(typeName)

            return isList
              ? collection.find(query)
              : collection.findOne(query)
          }
        }
      })
    })
  }

  return { refs }
}

function createBelongsToRefs (contentType, nodeTypes) {
  if (isEmpty(contentType.belongsTo)) return null

  const belongsTo = {
    resolve: obj => obj,
    type: new GraphQLObjectType({
      name: `${contentType.typeName}BelongsTo`,
      fields: () => mapValues(contentType.belongsTo, ref => {
        const { foreignSchemaType, description } = ref
        const nodeType = nodeTypes[foreignSchemaType]

        return {
          description,
          type: new GraphQLList(nodeType),
          resolve: (obj, args, { store }) => {
            const { collection } = store.getContentType(foreignSchemaType)
            const value = obj[ref.localKey]
            const key = ref.foreignKey

            return collection.find().filter(node => {
              const field = node.fields[key]

              return Array.isArray(field)
                ? field.includes(value)
                : false
            })
          }
        }
      })
    })
  }

  return { belongsTo }
}
