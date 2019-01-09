const { isEmpty } = require('lodash')
const camelCase = require('camelcase')
const { sortOrderType } = require('./types')
const { nodeInterface } = require('./interfaces')
const { isDate, dateTypeField } = require('./types/date')
const { isFile, fileType } = require('./types/file')
const { isImage, imageType } = require('./types/image')
const { fieldResolver, createRefResolver } = require('./resolvers')
const { warn } = require('../../utils/log')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLUnionType,
  GraphQLObjectType
} = require('../graphql')

function createFieldTypes (fields, typeName, nodeTypes) {
  const types = {}

  for (const key in fields) {
    const type = createFieldType(fields[key], key, typeName, nodeTypes)

    if (type) {
      types[key] = type
    }
  }

  return types
}

function createFieldType (value, key, typeName, nodeTypes) {
  const type = typeof value

  if (value === undefined) return null
  if (value === null) return null

  if (Array.isArray(value)) {
    const type = createFieldType(value[0], key, typeName, nodeTypes)

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

      return {
        type: GraphQLString,
        resolve: (...args) => fieldResolver(...args) || ''
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
      return isRef(value)
        ? createRefType(value, key, typeName, nodeTypes)
        : createObjectType(value, key, typeName, nodeTypes)
  }
}

function createObjectType (obj, fieldName, typeName, nodeTypes) {
  const name = createTypeName(typeName, fieldName)
  const fields = {}

  for (const key in obj) {
    const type = createFieldType(obj[key], key, name, nodeTypes)

    if (type) {
      fields[key] = type
    }
  }

  return !isEmpty(fields) ? {
    type: new GraphQLObjectType({ name, fields }),
    resolve: fieldResolver
  } : null
}

function createRefType (ref, fieldName, fieldTypeName, nodeTypes) {
  const typeName = Array.isArray(ref.typeName)
    ? ref.typeName.filter(typeName => nodeTypes.hasOwnProperty(typeName))
    : ref.typeName

  const res = {
    resolve: createRefResolver({ ...ref, typeName })
  }

  if (Array.isArray(typeName)) {
    if (typeName.length > 1) {
      res.type = new GraphQLUnionType({
        interfaces: [nodeInterface],
        name: createTypeName(fieldTypeName, fieldName + 'Ref'),
        description: `Reference to ${ref.typeName.join(', ')} nodes`,
        types: () => typeName.map(typeName => nodeTypes[typeName])
      })
    } else if (typeName.length === 1) {
      res.type = nodeTypes[typeName[0]]
    } else {
      warn(`No reference found for ${fieldName}.`)
      return null
    }
  } else if (nodeTypes.hasOwnProperty(typeName)) {
    res.type = nodeTypes[typeName]
  } else {
    warn(`No reference found for ${fieldName}.`)
    return null
  }

  if (ref.isList) {
    res.type = new GraphQLList(res.type)

    res.args = {
      sortBy: { type: GraphQLString },
      order: { type: sortOrderType, defaultValue: 'DESC' },
      skip: { type: GraphQLInt, defaultValue: 0 },
      limit: { type: GraphQLInt }
    }
  }

  return res
}

function createTypeName (typeName, key) {
  return camelCase(`${typeName} ${key}`, { pascalCase: true })
}

function is32BitInt (x) {
  return (x | 0) === x
}

function isRef (obj) {
  return (
    typeof obj === 'object' &&
    Object.keys(obj).length === 2 &&
    obj.hasOwnProperty('typeName') &&
    obj.hasOwnProperty('isList')
  )
}

module.exports = {
  createFieldTypes,
  createObjectType,
  createRefType
}
