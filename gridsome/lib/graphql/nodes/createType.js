const graphql = require('../graphql')
const createBelongsTo = require('./createBelongsTo')
const { createRefResolver } = require('../resolvers')
const { createFieldTypes, createRefType } = require('../createFieldTypes')
const { mapValues, isEmpty } = require('lodash')

module.exports = function createType ({
  schemaComposer,
  contentType,
  typeNames,
  typeName,
  fields
}) {
  const nodeType = schemaComposer.createObjectTC({
    name: typeName,
    interfaces: ['Node'],
    isTypeOf: node => node.internal.typeName === typeName
  })

  const fieldTypes = createFieldTypes(schemaComposer, fields, typeName, typeNames)
  const refTypes = createRefs(schemaComposer, contentType, fieldTypes, typeNames)
  const thirdPartyFields = extendNodeType(contentType)
  const belongsTo = createBelongsTo({ schemaComposer, typeNames, typeName })

  nodeType.addFields(fieldTypes)
  nodeType.addFields(refTypes)
  nodeType.addFields(thirdPartyFields)
  nodeType.addFields({ belongsTo })
  nodeType.addFields({ id: 'ID!' })

  return nodeType
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
