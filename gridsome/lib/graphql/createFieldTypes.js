const { isEmpty } = require('lodash')
const { isFile, fileType } = require('./types/file')
const { isImage, imageType } = require('./types/image')
const { isDate, dateType } = require('./types/date')
const { ObjectTypeComposer } = require('graphql-compose')
const { is32BitInt, isRefFieldDefinition, createTypeName } = require('./utils')

function createFieldTypes (schemaComposer, fields, prefix = '') {
  const res = {}

  for (const key in fields) {
    const options = fields[key]
    const result = createFieldType(schemaComposer, options.value, key, prefix)

    if (result) {
      res[options.fieldName] = result
    }
  }

  return res
}

function createFieldType (schemaComposer, value, key, prefix) {
  if (Array.isArray(value)) {
    const type = createFieldType(schemaComposer, value[0], key, prefix)

    return type !== null ? {
      type: [type.type],
      args: type.args,
      resolve: (obj, args, context, info) => {
        const arr = obj[key]

        if (!Array.isArray(arr)) return []

        return arr.map((_, i) => {
          return typeof type.resolve === 'function'
            ? type.resolve(arr, args, context, { ...info, fieldName: i })
            : arr[i]
        })
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
        ? createRefType(schemaComposer, value, key, prefix)
        : createObjectType(schemaComposer, value, key, prefix)
  }
}

function createObjectType (schemaComposer, value, fieldName, prefix) {
  const name = createTypeName(prefix, fieldName)
  const fields = {}

  for (const key in value) {
    const options = value[key]
    const type = createFieldType(schemaComposer, options.value, key, name)

    if (type) {
      fields[options.fieldName] = type
    }
  }

  return !isEmpty(fields)
    ? { type: ObjectTypeComposer.createTemp({ name, fields }, schemaComposer) }
    : null
}

const {
  createReferenceOneUnionResolver,
  createReferenceManyUnionResolver
} = require('./nodes/resolvers')

function createRefType (schemaComposer, ref, fieldName, fieldTypeName) {
  const typeNames = Array.isArray(ref.typeName) ? ref.typeName : [ref.typeName]

  if (typeNames.length > 1) {
    const typeComposer = schemaComposer.createUnionTC({
      name: createTypeName(fieldTypeName, fieldName + 'Ref'),
      description: `Reference to ${typeNames.join(', ')} nodes`,
      interfaces: ['Node'],
      types: () => typeNames
    })

    return {
      type: ref.isList
        ? [typeComposer]
        : typeComposer,
      resolve: ref.isList
        ? createReferenceManyUnionResolver(typeComposer)
        : createReferenceOneUnionResolver(typeComposer)
    }
  }

  const typeComposer = schemaComposer.get(typeNames[0])
  const resolverName = ref.isList ? 'referenceManyAdvanced' : 'referenceOne'

  return typeComposer.getResolver(resolverName)
}

module.exports = {
  createFieldTypes,
  createRefType
}
