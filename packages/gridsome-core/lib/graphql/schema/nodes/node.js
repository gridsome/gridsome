const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const graphql = require('../../graphql')

const { nodeInterface } = require('../interfaces')
const baseNodeFields = require('../node-fields')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLInterfaceType,
} = graphql

const fieldsInterface = new GraphQLInterfaceType({
  name: 'FieldsInterface',
  fields: () => ({
    title: { type: GraphQLString },
    created: { type: GraphQLString },
    updated: { type: GraphQLString }
  })
})

module.exports = ({ contentType, nodeTypes, source }) => {
  const nodeType = new GraphQLObjectType({
    name: contentType.type,
    description: contentType.name,
    interfaces: [nodeInterface],
    isTypeOf: node => {
      return node.type === contentType.type
    },
    fields: () => {
      const customFields = typeof contentType.fields === 'function'
        ? contentType.fields()
        : {}

      const fields = {
        ...customFields,

        title: {
          type: GraphQLString,
          description: 'Title'
        },
        created: {
          type: GraphQLString,
          description: 'Created date',
          args: { format: { type: GraphQLString, description: 'Date format' } },
          resolve: (fields, { format }) => dateFormat(fields.created, format)
        },
        updated: {
          type: GraphQLString,
          description: 'Updated date',
          args: { format: { type: GraphQLString, description: 'Date format' } },
          resolve: (fields, { format }) => dateFormat(fields.updated, format)
        },
      }

      const nodeRefs = []
      const belongsTo = {}

      const addReference = (options) => nodeRefs.push(options)

      if (typeof contentType.refs === 'function') {
        contentType.refs({ addReference, nodeTypes })
      }

      if (typeof contentType.belongsTo === 'function') {
        Object.assign(belongsTo, contentType.belongsTo({ nodeTypes }))
      }

      const nodeFields = {
        ...baseNodeFields,
        fields: {
          type: new GraphQLObjectType({
            name: `${contentType.type}Fields`,
            interfaces: [fieldsInterface],
            fields
          })
        }
      }

      if (nodeRefs.length) {
        nodeFields.refs = {
          type: new GraphQLObjectType({
            name: `${contentType.type}References`,
            fields: () => nodeRefs.reduce((refs, { name, type, types, description }) => {
              const fieldTypeName = camelCase(name, { pascalCase: true })

              // create a union type if reference
              // accepts multiple content types
              if (Array.isArray(types)) {
                type = new GraphQLUnionType({
                  name: `${contentType.type}${fieldTypeName}Nodes`,
                  interfaces: [nodeInterface],
                  types
                })
              }

              refs[name] = {
                description,
                type: new GraphQLList(type),
                resolve: obj => new Promise((resolve, reject) => {
                  source.nodes.find({ _id: { $in: obj[name] } }, (err, nodes) => {
                    if (err) reject(err)
                    else resolve(nodes)
                  })
                })
              }

              return refs
            }, {})
          })
        }
      }

      if (Object.keys(belongsTo).length) {
        const belongsToType = new GraphQLUnionType({
          name: `${contentType.type}BelongsTo`,
          interfaces: [nodeInterface],
          types: belongsTo.types
        })

        nodeFields.belongsTo = {
          type: new GraphQLList(belongsToType),
          resolve: obj => new Promise((resolve, reject) => {
            const q = { [`refs.${belongsTo.key}`]: { $in: [obj._id] } }
            source.nodes.find(q, (err, nodes) => {
              if (err) reject(err)
              else resolve(nodes)
            })
          })
        }
      }

      if (contentType.isHierichal) {
        nodeFields.parent = {
          type: nodeType,
          resolve (node) {
            return new Promise((resolve, reject) => {
              nodes.findOne({ _id: node.parent }, (err, node) => {
                if (err) reject(err)
                else resolve(node)
              })
            })
          }
        }

        nodeFields.children = {
          type: new GraphQLList(nodeType),
          resolve (node) {
            return new Promise((resolve, reject) => {
              nodes.find({ parent: node._id }, (err, nodes) => {
                if (err) reject(err)
                else resolve(nodes)
              })
            })
          }
        }

        nodeFields.depth = {
          type: GraphQLInt,
          resolve (node) {
            return getDepth(node)
          }
        }
      }

      return nodeFields
    }
  })

  return nodeType
}
