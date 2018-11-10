const camelCase = require('camelcase')
const { mapValues, isEmpty } = require('lodash')
const { fieldResolver } = require('./resolvers')
const { isDate, dateType } = require('./types/date')
const { isImage, imageType } = require('./types/image');

const {
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} = require('../graphql')

function inferTypes (nodes, nodeType) {
  const fields = {}
  let node, type

  for (let i = 0, l = nodes.length; i < l; i++) {
    node = nodes[i]

    for (const key in node.fields) {
      if (key.startsWith('__')) continue
      if ((type = inferType(node.fields[key], key, nodeType))) {
        fields[key] = type
      }
    }
  }

  return fields
}

function inferType (value, key, nodeType) {
  if (value === undefined) return null
  if (value === null) return null

  if (Array.isArray(value)) {
    const type = inferType(value[0], key, nodeType)
    return type !== null ? {
      type: new GraphQLList(type.type),
      resolve: (obj, args, context, info) => {
        const value = fieldResolver(obj, args, context, info)
        return Array.isArray(value) ? value : []
      }
    } : null
  }

  const type = typeof value

  if (isDate(value)) {
    return dateType
  }

  if (isImage(value)) {
    return imageType
  }

  switch (type) {
    case 'string':
      return {
        type: GraphQLString,
        resolve: fieldResolver
      }
    case 'boolean':
      return {
        type: GraphQLBoolean,
        resolve: fieldResolver
      }
    case 'number':
      return {
        type: is32BitInt(value) ? GraphQLInt : GraphQLFloat,
        resolve: fieldResolver
      }
    case 'object':
      return createObjectType(value, key, nodeType)
  }
}

function createObjectType (obj, key, nodeType) {
  const name = createTypeName(nodeType, key)
  const fields = mapValues(obj, (value, key) => inferType(value, key, name))

  return !isEmpty(fields) ? {
    type: new GraphQLObjectType({ name, fields }),
    resolve: obj => obj
  } : null
}

function createTypeName (nodeType, key) {
  return camelCase(`${nodeType} ${key}`, { pascalCase: true })
}

function is32BitInt (x) {
  return (x | 0) === x
}

module.exports = {
  inferTypes,
  inferType
}
