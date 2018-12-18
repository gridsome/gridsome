const camelCase = require('camelcase')
const { sortOrderType } = require('./types')
const { nodeInterface } = require('./interfaces')
const { isDate, dateTypeField } = require('./types/date')
const { isFile, fileType } = require('./types/file')
const { isImage, imageType } = require('./types/image')
const { isEmpty, isPlainObject } = require('lodash')
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

function inferTypes (nodes, typeName, nodeTypes) {
  const types = {}
  let fields = {}

  for (let i = 0, l = nodes.length; i < l; i++) {
    fields = getFieldValues(nodes[i].fields, fields)
  }

  for (const key in fields) {
    const type = inferType(fields[key], key, typeName, nodeTypes)

    if (type) {
      types[key] = type
    }
  }

  return types
}

function getFieldValues (obj, currentObj = {}) {
  const res = { ...currentObj }

  for (const key in obj) {
    const value = obj[key]

    if (key.startsWith('__')) continue
    if (value === undefined) continue
    if (value === null) continue

    res[key] = getFieldValue(value, currentObj[key])
  }

  return res
}

function getFieldValue (value, currentValue) {
  if (Array.isArray(value)) {
    if (isRefField(value[0])) {
      const ref = currentValue || { typeName: [], isList: true }

      for (let i = 0, l = value.length; i < l; i++) {
        if (!ref.typeName.includes(value[i].typeName)) {
          ref.typeName.push(value[i].typeName)
        }
      }

      return ref
    }

    return value.map((value, index) => {
      return getFieldValue(value, currentValue ? currentValue[index] : undefined)
    })
  } else if (isPlainObject(value)) {
    if (isRefField(value)) {
      const ref = currentValue || { typeName: value.typeName }
      ref.isList = ref.isList || Array.isArray(value.id)

      return ref
    }

    return getFieldValues(value, currentValue)
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

function isRefField (field) {
  return (
    typeof field === 'object' &&
    Object.keys(field).length === 2 &&
    field.hasOwnProperty('typeName') &&
    field.hasOwnProperty('id')
  )
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
  inferTypes,
  createObjectType,
  createRefType
}
