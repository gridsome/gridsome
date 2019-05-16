const graphql = require('../graphql')
const { defaultFieldResolver } = require('graphql')
const createBelongsTo = require('./createBelongsTo')
const { createRefResolver } = require('../resolvers')
const { createFieldTypes, createRefType } = require('../createFieldTypes')
const { reduce, mapValues, isEmpty, isPlainObject } = require('lodash')
const { isRefFieldDefinition } = require('../utils')

module.exports = function createType ({
  schemaComposer,
  contentType,
  typeNames,
  typeName,
  fieldDefs
}) {
  if (schemaComposer.has(typeName)) {
    if (!schemaComposer.get(typeName).hasInterface('Node')) {
      throw new Error(
        `The '${typeName}' GraphQL type must implement the 'Node' ` +
        `interface bacause it will represent a content type.`
      )
    }
  }

  const typeComposer = schemaComposer.getOrCreateOTC(typeName)
  const fieldNames = Object.keys(typeComposer.getFields())
  const missingFields = reduce(fieldDefs, (acc, def) => {
    if (!fieldNames.includes(def.fieldName)) {
      acc[def.fieldName] = def
    }
    return acc
  }, {})

  const fieldTypes = createFieldTypes(schemaComposer, missingFields, typeName, typeNames)

  processMissingFields(typeComposer, missingFields, fieldTypes)

  const refTypes = createRefs(schemaComposer, contentType, fieldTypes, typeNames)
  const thirdPartyFields = extendNodeType(contentType)
  const belongsTo = createBelongsTo({ schemaComposer, typeNames, typeName })

  typeComposer.setIsTypeOf(node => node.internal.typeName === typeName)
  typeComposer.addInterface('Node')
  typeComposer.addFields(fieldTypes)
  typeComposer.addFields(refTypes)
  typeComposer.addFields(thirdPartyFields)
  typeComposer.addFields({ belongsTo })
  typeComposer.addFields({ id: 'ID!' })

  return typeComposer
}

function processMissingFields (typeComposer, fieldDefs, fieldTypes) {
  for (const key in fieldDefs) {
    const options = fieldDefs[key]
    const fieldType = fieldTypes[options.fieldName]

    if (options.fieldName !== options.key) {
      const resolve = fieldType.resolve || defaultFieldResolver

      // wrap field resolver to use original field name in info.fieldName
      fieldType.resolve = (obj, args, ctx, info) => {
        return resolve(obj, args, ctx, { ...info, fieldName: options.key })
      }
    }

    if (isPlainObject(options.value) && !isRefFieldDefinition(options.value)) {
      processMissingFields(typeComposer, options.value, fieldType.type.getFields())
    }
  }
}

function extendNodeType (contentType) {
  const context = { contentType, graphql }
  const fields = {}

  for (const mimeType in contentType.options.mimeTypes) {
    const transformer = contentType.options.mimeTypes[mimeType]
    if (typeof transformer.extendNodeType === 'function') {
      Object.assign(fields, transformer.extendNodeType(context))
    }
  }

  for (const fieldName in contentType.options.fields) {
    const field = contentType.options.fields[fieldName]
    if (typeof field === 'function') {
      fields[fieldName] = field(context)
    }
  }

  return fields
}

function createRefs (schemaComposer, contentType, fieldTypes, typeNames) {
  if (isEmpty(contentType.options.refs)) return {}

  return mapValues(contentType.options.refs, ({ typeName }, fieldName) => {
    const field = fieldTypes[fieldName] || 'String'
    const isList = Array.isArray(field.type)
    const ref = { typeName, isList }

    const resolve = createRefResolver(ref)

    return {
      ...createRefType(schemaComposer, ref, fieldName, typeName, typeNames),
      resolve (obj, args, context, info) {
        const field = {
          [fieldName]: {
            typeName,
            id: obj[fieldName]
          }
        }

        return resolve(field, args, context, info)
      }
    }
  })
}
