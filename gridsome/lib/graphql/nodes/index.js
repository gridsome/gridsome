const camelCase = require('camelcase')
const createQuery = require('./createQuery')
const createBelongsTo = require('./createBelongsTo')
const createConnection = require('./createConnection')
const { createFilterTypes } = require('../createFilterTypes')
const createFieldDefinitions = require('../createFieldDefinitions')
const { createFieldTypes, createRefType } = require('../createFieldTypes')
const { createRefResolver } = require('../resolvers')
const { isRefFieldDefinition } = require('../utils')
const { defaultFieldResolver } = require('graphql')

const { reduce, mapValues, isEmpty, isPlainObject } = require('lodash')

module.exports = (schemaComposer, store) => {
  const typeNames = Object.keys(store.collections)
  const schema = {}

  for (const typeName of typeNames) {
    const contentType = store.getContentType(typeName)
    const nodes = contentType.data().concat({ id: '' })
    const typeComposer = createTypeComposer(schemaComposer, typeName)
    const fieldDefs = createFieldDefinitions(nodes)
    const config = getConfig(typeComposer)

    const args = {
      schemaComposer,
      typeComposer,
      contentType,
      fieldDefs,
      typeNames,
      typeName,
      config
    }

    const filterComposer = createFilterComposer(args)
    const belongsTo = createBelongsTo(args)

    typeComposer.addFields(createFields(args))
    typeComposer.addFields(createRefFields(args))
    typeComposer.addFields(createThirdPartyFields(args))
    typeComposer.addFields({ belongsTo })
    typeComposer.addFields({ id: 'ID!' })

    typeComposer.addInterface('Node')
    typeComposer.setIsTypeOf(node => node.internal.typeName === typeName)

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

function getConfig (typeComposer) {
  const { config = {}} = typeComposer.getExtensions()

  typeComposer.getDirectives().forEach(directive => {
    config[directive.name] = directive.args
  })

  return config
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
  typeNames,
  config
}) {
  const fieldNames = Object.keys(typeComposer.getFields())
  const inferFields = reduce(fieldDefs, (acc, def) => {
    if (config.infer === false) return acc
    if (config.dontInfer) return acc

    if (!fieldNames.includes(def.fieldName)) {
      acc[def.fieldName] = def
    }
    return acc
  }, {})

  const fields = createFieldTypes(schemaComposer, inferFields, typeName, typeNames)

  processInferredFields(typeComposer, inferFields, fields)

  return fields
}

function processInferredFields (typeComposer, fieldDefs, fieldTypes) {
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
