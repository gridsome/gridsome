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
  return new GraphQLObjectType({
    name: contentType.name,
    description: contentType.description,
    interfaces: [nodeInterface],
    isTypeOf: node => node.typeName === contentType.name,
    fields: () => ({
      type: { type: new GraphQLNonNull(GraphQLString) },
      internal: { type: new GraphQLNonNull(internalType) },
      title: { type: GraphQLString },
      slug: { type: GraphQLString },
      path: { type: GraphQLString },
      content: { type: GraphQLString },
      date: dateType,

      _id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: node => node.$loki
      },

      ...createFields(contentType, fields),
      ...createRefs(contentType, nodeTypes),
      ...createForeignRefs(contentType, nodeTypes)
    })
  })
}

function createFields (contentType, customFields) {
  const fields = {
    type: new GraphQLObjectType({
      name: `${contentType.name}Fields`,
      interfaces: [fieldsInterface],
      fields: {
        title: { type: GraphQLString },
        ...customFields
      }
    })
  }

  return { fields }
}

function createRefs (contentType, nodeTypes) {
  if (isEmpty(contentType.refs)) return null

  const refs = {
    resolve: obj => obj,
    type: new GraphQLObjectType({
      name: `${contentType.name}References`,
      fields: () => mapValues(contentType.refs, (ref, key) => {
        const { schemaType, description } = ref
        let refType = nodeTypes[schemaType]

        if (Array.isArray(schemaType)) {
          // TODO: create union collection
          const fieldTypeName = camelCase(key, { pascalCase: true })
          refType = new GraphQLUnionType({
            name: `${contentType.name}${fieldTypeName}Union`,
            interfaces: [nodeInterface],
            types: schemaType.map(schemaType => nodeTypes[schemaType])
          })
        }

        return {
          description,
          type: new GraphQLList(refType),
          resolve: (obj, args, { store }) => {
            const $in = obj.fields[key] || []
            const query = { [ref.key]: { $in }}

            return store.collections[schemaType].find(query)
          }
        }
      })
    })
  }

  return { refs }
}

function createForeignRefs (contentType, nodeTypes) {
  if (isEmpty(contentType.belongsTo)) return null

  const belongsTo = {
    resolve: obj => obj,
    type: new GraphQLObjectType({
      name: `${contentType.name}BelongsTo`,
      fields: () => mapValues(contentType.belongsTo, ref => {
        const { foreignSchemaType, description } = ref
        const nodeType = nodeTypes[foreignSchemaType]

        return {
          description,
          type: new GraphQLList(nodeType),
          resolve: (obj, args, { store }) => {
            const collection = store.collections[foreignSchemaType]
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
