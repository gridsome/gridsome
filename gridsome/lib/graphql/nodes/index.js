const camelCase = require('camelcase')
const createQuery = require('./createQuery')
const createBelongsTo = require('./createBelongsTo')
const createConnection = require('./createConnection')
const { createFilterTypes } = require('../createFilterTypes')
const createFieldDefinitions = require('../createFieldDefinitions')
const { createFieldTypes, createRefType } = require('../createFieldTypes')
const { isRefField, isRefFieldDefinition } = require('../utils')
const { createRefResolver } = require('../resolvers')

const { reduce, mapValues, isEmpty, isPlainObject } = require('lodash')

module.exports = function createNodesSchema (schemaComposer, store) {
  const typeNames = Object.keys(store.collections)
  const schema = {}

  for (const typeName of typeNames) {
    const contentType = store.getContentType(typeName)
    const typeComposer = createTypeComposer(schemaComposer, typeName)
    const fieldDefs = inferFields(typeComposer, contentType)

    const args = {
      schemaComposer,
      typeComposer,
      contentType,
      fieldDefs,
      typeNames,
      typeName
    }

    const filterComposer = createFilterComposer(args)
    const belongsTo = createBelongsTo(args)

    typeComposer.addFields(createFields(args))
    typeComposer.addFields(createRefFields(args))
    typeComposer.addFields(createThirdPartyFields(args))
    typeComposer.addFields({ belongsTo })
    typeComposer.addFields({ id: 'ID!' })

    createResolvers(args).forEach(resolver => {
      typeComposer.addResolver(resolver)
    })

    typeComposer.addInterface('Node')
    typeComposer.setIsTypeOf(node => node.internal && node.internal.typeName === typeName)

    schema[camelCase(typeName)] = createQuery({ ...args, filterComposer })
    schema[`all${typeName}`] = createConnection({ ...args, filterComposer })
  }

  return schema
}

function createTypeComposer (schemaComposer, typeName) {
  if (schemaComposer.has(typeName)) {
    if (!schemaComposer.get(typeName).hasInterface('Node')) {
      throw new Error(
        `The '${typeName}' GraphQL type must implement the 'Node' interface`
      )
    }
  }

  return schemaComposer.getOrCreateOTC(typeName)
}

function inferFields (typeComposer, contentType) {
  const extensions = typeComposer.getExtensions()
  const mustHaveFields = { id: '' }

  // user defined schemas must enable inference
  if (extensions.isUserDefined && !extensions.infer) {
    return createFieldDefinitions([mustHaveFields])
  }

  return createFieldDefinitions(
    contentType.data().concat(mustHaveFields)
  )
}

// TODO: extend existing filter input type
function createFilterComposer ({ schemaComposer, typeName, fieldDefs }) {
  const fields = createFilterTypes(schemaComposer, fieldDefs, `${typeName}Filter`)
  const name = `${typeName}Filters`

  return schemaComposer.createInputTC({ name, fields })
}

function createFields ({
  schemaComposer,
  typeComposer,
  fieldDefs,
  typeName,
  typeNames
}) {
  const fieldNames = typeComposer.getFieldNames()

  const inferFieldDefs = reduce(fieldDefs, (acc, def) => {
    if (!fieldNames.includes(def.fieldName)) {
      acc[def.fieldName] = def
    }

    return acc
  }, {})

  const fieldTypes = createFieldTypes(schemaComposer, inferFieldDefs, typeName, typeNames)

  processInferredFields(typeComposer, inferFieldDefs, fieldTypes)

  return fieldTypes
}

function processInferredFields (typeComposer, fieldDefs, fieldTypes) {
  for (const key in fieldDefs) {
    const options = fieldDefs[key]
    const fieldType = fieldTypes[options.fieldName]

    fieldType.extensions = options.extensions

    if (isPlainObject(options.value) && !isRefFieldDefinition(options.value)) {
      processInferredFields(typeComposer, options.value, fieldType.type.getFields())
    }
  }
}

function createThirdPartyFields ({ contentType }) {
  const graphql = require('../graphql')
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

function createResolvers ({ typeComposer, contentType }) {
  return [
    {
      name: 'findOne',
      type: typeComposer,
      args: {
        by: { type: 'String', defaultValue: 'id' }
      },
      resolve (obj, { by }, ctx, info) {
        const fieldValue = obj[info.fieldName]
        const referenceValue = isRefField(fieldValue)
          ? fieldValue.id
          : fieldValue

        if (!fieldValue) return null

        if (by === 'id') {
          return contentType.getNode(referenceValue)
        } else {
          return contentType.findNode({ [by]: referenceValue })
        }
      }
    },
    {
      name: 'findMany',
      type: [typeComposer],
      args: {
        by: { type: 'String', defaultValue: 'id' }
      },
      resolve (obj, { by }, ctx, info) {
        const fieldValue = obj[info.fieldName]
        const referenceValues = Array.isArray(fieldValue)
          ? fieldValue.map(value => isRefField(value) ? value.id : value)
          : []

        if (referenceValues.length < 1) return []

        return contentType.findNodes({
          [by]: { $in: referenceValues }
        })
      }
    }
  ]
}

function createRefFields ({
  schemaComposer,
  contentType,
  fieldDefs,
  typeNames
}) {
  if (isEmpty(contentType.options.refs)) return {}

  return mapValues(contentType.options.refs, ({ typeName }, fieldName) => {
    const isList = Array.isArray(fieldDefs[fieldName].value)
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
