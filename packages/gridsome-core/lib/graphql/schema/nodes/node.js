const camelCase = require('camelcase')
const graphql = require('../../graphql')
const { mapValues, isEmpty } = require('lodash')

const { internalType } = require('../types')
const { nodeInterface } = require('../interfaces')
const { inferTypes } = require('../infer-types')

const {
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType
} = graphql

const fieldsInterface = new GraphQLInterfaceType({
  name: 'FieldsInterface',
  fields: () => ({
    title: { type: GraphQLString }
  })
})

module.exports = ({ contentType, nodeTypes, source }) => {
  return new GraphQLObjectType({
    name: contentType.type,
    description: contentType.description,
    interfaces: [nodeInterface],
    isTypeOf: node => node.type === contentType.type,
    fields: () => ({
      type: { type: new GraphQLNonNull(GraphQLString) },
      internal: { type: new GraphQLNonNull(internalType) },
      title: { type: GraphQLString },
      slug: { type: GraphQLString },
      path: { type: GraphQLString },
      content: { type: GraphQLString },

      _id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: node => node.$loki
      },

      ...createFields(contentType, nodeTypes, source),
      ...createRefs(contentType, nodeTypes, source),
      ...createForeignRefs(contentType, nodeTypes, source)
    })
  })
}

function createFields (contentType, nodeTypes, source) {
  const nodes = source.nodes.find({ type: contentType.type })
  const customFields = inferTypes(nodes, contentType.type)

  const fields = {
    type: new GraphQLObjectType({
      name: `${contentType.type}Fields`,
      interfaces: [fieldsInterface],
      fields: {
        title: { type: GraphQLString },
        ...customFields
      }
    })
  }

  return { fields }
}

function createRefs (contentType, nodeTypes, source) {
  if (isEmpty(contentType.refs)) return null

  const refs = {
    resolve: obj => obj,
    type: new GraphQLObjectType({
      name: `${contentType.type}References`,
      fields: () => mapValues(contentType.refs, (ref, key) => {
        const { schemaType, description } = ref
        let refType = nodeTypes[schemaType]

        if (Array.isArray(schemaType)) {
          const fieldTypeName = camelCase(key, { pascalCase: true })
          refType = new GraphQLUnionType({
            name: `${contentType.type}${fieldTypeName}Union`,
            interfaces: [nodeInterface],
            types: schemaType.map(schemaType => nodeTypes[schemaType])
          })
        }

        return {
          description,
          type: new GraphQLList(refType),
          resolve: obj => {
            const $in = obj.fields[key] || []
            const query = { type: schemaType, [ref.key]: { $in }}

            return source.nodes.find(query)
          }
        }
      })
    })
  }

  return { refs }
}

function createForeignRefs (contentType, nodeTypes, source) {
  if (isEmpty(contentType.belongsTo)) return null

  const belongsTo = {
    resolve: obj => obj,
    type: new GraphQLObjectType({
      name: `${contentType.type}BelongsTo`,
      fields: () => mapValues(contentType.belongsTo, ref => {
        const { foreignSchemaType, description } = ref
        const nodeType = nodeTypes[foreignSchemaType]

        return {
          description,
          type: new GraphQLList(nodeType),
          resolve: obj => {
            const query = { type: foreignSchemaType }
            const value = obj[ref.localKey]
            const key = ref.foreignKey

            return source.nodes.find(query).filter(node => {
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
