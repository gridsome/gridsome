const camelCase = require('camelcase')
const { isEmpty, mapValues } = require('lodash')
const { nodeInterface } = require('./interfaces')
const { isDate, dateTypeField } = require('./types/date')
const { isFile, fileType } = require('./types/file')
const { isImage, imageType } = require('./types/image')
const { fieldResolver, refResolver } = require('./resolvers')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLUnionType,
  GraphQLObjectType
} = require('../graphql')

function inferTypes (nodes, typeName, nodeTypes) {
  const types = {}
  let fields = {}

  for (let i = 0, l = nodes.length; i < l; i++) {
    fields = populateFeilds(nodes[i].fields, fields)
  }

  for (const key in fields) {
    const type = inferType(fields[key], key, typeName, nodeTypes)
    
    if (type) {
      types[key] = type
    }
  }

  return types
}

function populateFeilds (obj, currentObj = {}) {
  const res = { ...currentObj }

  for (const key in obj) {
    const value = obj[key]

    if (key.startsWith('__')) continue
    if (value === undefined) continue
    if (value === null) continue

    res[key] = populateField(value, currentObj[key])
  }

  return res
}

function populateField (value, currentValue) {
  if (Array.isArray(value)) {
    return value.slice(0, 1).map(value => {
      return populateField(value, currentValue ? currentValue[0] : undefined)
    })
  } else if (typeof value === 'object') {
    return populateFeilds(value, currentValue)
  }

  return currentValue !== undefined ? currentValue : value
}

function inferType (value, key, typeName, nodeTypes) {
  const type = typeof value

  if (value === undefined) return null
  if (value === null) return null

  if (Array.isArray(value)) {
    const type = inferType(value[0], key, typeName, nodeTypes)
    
    return type !== null ? {
      type: new GraphQLList(type.type),
      resolve: (obj, args, context, info) => {
        const value = fieldResolver(obj, args, context, info)
        return Array.isArray(value) ? value : []
      }
    } : null
  }

  if (isDate(value)) {
    return dateTypeField
  }

  switch (type) {
    case 'string':
      if (isImage(value)) return imageType
      if (isFile(value)) return fileType

      return value ? {
        type: GraphQLString,
        resolve: fieldResolver
      } : null
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
      return isRef(value)
        ? createRefType(value, key, typeName, nodeTypes)
        : createObjectType(value, key, typeName, nodeTypes)
  }
}

function createObjectType (obj, key, typeName, nodeTypes) {
  const name = createTypeName(typeName, key)
  const fields = {}

  for (const key in obj) {
    const type = inferType(obj[key], key, name, nodeTypes)

    if (type) {
      fields[key] = type
    }
  }

  return !isEmpty(fields) ? {
    type: new GraphQLObjectType({ name, fields }),
    resolve: fieldResolver
  } : null
}

function createRefType (obj, key, typeName, nodeTypes) {
  const typeNames = Array.isArray(obj.typeName) ? obj.typeName : [obj.typeName]
  const name = createTypeName(typeName, key + 'Ref')
  const isList = Array.isArray(obj.value)

  const type = typeNames.length > 1
    ? new GraphQLUnionType({
      name,
      interfaces: [nodeInterface],
      types: () => typeNames.map(typeName => nodeTypes[typeName])
    })
    : nodeTypes[typeNames[0]]

  return {
    type: isList ? new GraphQLList(type) : type,
    resolve: refResolver
  }
}

function createTypeName (typeName, key) {
  return camelCase(`${typeName} ${key}`, { pascalCase: true })
}

function is32BitInt (x) {
  return (x | 0) === x
}

function isRef (obj) {
  if (typeof obj !== 'object') {
    return false
  }

  return (
    Object.keys(obj).length === 2 &&
    obj.hasOwnProperty('typeName') &&
    obj.hasOwnProperty('value')
  )
}

module.exports = inferTypes
