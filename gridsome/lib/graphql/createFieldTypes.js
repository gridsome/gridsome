const { isEmpty } = require('lodash')
const { isFile, fileType } = require('./types/file')
const { isImage, imageType } = require('./types/image')
const { isDate, dateType } = require('./types/date')
const { createRefResolver } = require('./resolvers')
const { ObjectTypeComposer, UnionTypeComposer } = require('graphql-compose')
const { is32BitInt, isRefFieldDefinition, createTypeName } = require('./utils')
const { SORT_ORDER } = require('../utils/constants')
const { warn } = require('../utils/log')

function createFieldTypes (schemaComposer, fields, typeName, typeNames = []) {
  const res = {}

  for (const key in fields) {
    const options = fields[key]
    const result = createFieldType(schemaComposer, options.value, key, typeName, typeNames)

    if (result) {
      res[options.fieldName] = result
    }
  }

  return res
}

function createFieldType (schemaComposer, value, key, typeName, typeNames) {
  if (value === undefined) return null
  if (value === null) return null

  if (Array.isArray(value)) {
    const type = createFieldType(schemaComposer, value[0], key, typeName, typeNames)

    return type !== null ? {
      type: [type.type],
      resolve: obj => {
        const value = obj[key]
        return Array.isArray(value) ? value : []
      }
    } : null
  }

  if (isDate(value)) {
    return dateType
  }

  switch (typeof value) {
    case 'string':
      if (isImage(value)) return imageType
      if (isFile(value)) return fileType

      return {
        type: 'String',
        resolve (obj, args, ctx, info) {
          return obj[info.fieldName] || ''
        }
      }
    case 'boolean':
      return { type: 'Boolean' }
    case 'number':
      return { type: is32BitInt(value) ? 'Int' : 'Float' }
    case 'object':
      return isRefFieldDefinition(value)
        ? createRefType(schemaComposer, value, key, typeName, typeNames)
        : createObjectType(schemaComposer, value, key, typeName, typeNames)
  }
}

function createObjectType (schemaComposer, value, fieldName, typeName, typeNames) {
  const name = createTypeName(typeName, fieldName)
  const fields = {}

  for (const key in value) {
    const options = value[key]
    const type = createFieldType(schemaComposer, options.value, key, name, typeNames)

    if (type) {
      fields[options.fieldName] = type
    }
  }

  return !isEmpty(fields)
    ? { type: ObjectTypeComposer.createTemp({ name, fields }, schemaComposer) }
    : null
}

function createRefType (schemaComposer, ref, fieldName, fieldTypeName, typeNames) {
  const typeName = Array.isArray(ref.typeName)
    ? ref.typeName.filter(typeName => typeNames.includes(typeName))
    : ref.typeName

  const res = {
    resolve: createRefResolver({ ...ref, typeName })
  }

  if (Array.isArray(typeName)) {
    if (typeName.length > 1) {
      res.type = UnionTypeComposer.createTemp({
        name: createTypeName(fieldTypeName, fieldName + 'Ref'),
        description: `Reference to ${ref.typeName.join(', ')} nodes`,
        interfaces: ['Node'],
        types: typeName
      }, schemaComposer)
    } else if (typeName.length === 1) {
      res.type = typeName[0]
    } else {
      warn(`No reference found for ${fieldName}.`)
      return null
    }
  } else if (typeNames.includes(typeName)) {
    res.type = typeName
  } else {
    warn(`No reference found for ${fieldName}.`)
    return null
  }

  if (ref.isList) {
    res.type = [res.type]

    res.args = {
      sortBy: { type: 'String' },
      order: { type: 'SortOrder', defaultValue: SORT_ORDER },
      skip: { type: 'Int', defaultValue: 0 },
      sort: { type: '[SortArgument]' },
      limit: { type: 'Int' }
    }
  }

  return res
}

module.exports = {
  createFieldTypes,
  createRefType
}
