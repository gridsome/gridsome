const camelCase = require('camelcase')
const { createBelongsTo } = require('./belongsTo')
const { PER_PAGE } = require('../../utils/constants')
const { createRefResolver } = require('../resolvers')
const { createFilterInput } = require('../filters/input')
const createFieldDefinitions = require('../createFieldDefinitions')
const { createFieldTypes, createRefType } = require('../createFieldTypes')
const { isRefFieldDefinition } = require('../utils')

const { reduce, mapValues, isEmpty, isPlainObject } = require('lodash')

module.exports = function createNodesSchema (schemaComposer, store) {
  const typeNames = Object.keys(store.collections)
  const schema = {}

  schemaComposer.createEnumTC({
    name: 'TypeName',
    values: typeNames.reduce((acc, value) => (acc[value] = { value } && acc), {})
  })

  createTypeComposers(schemaComposer, store)

  for (const typeName of typeNames) {
    const contentType = store.getContentType(typeName)
    const typeComposer = schemaComposer.get(typeName)
    const fieldDefs = inferFields(typeComposer, contentType)

    const args = {
      schemaComposer,
      typeComposer,
      contentType,
      fieldDefs,
      typeNames,
      typeName
    }

    createFields(args)
    createRefFields(args)
    createFilterInput(schemaComposer, typeComposer)
    createResolvers(typeComposer, contentType)

    typeComposer.addFields(createThirdPartyFields(args))

    const fieldName = camelCase(typeName)
    const allFieldName = camelCase(`all ${typeName}`)

    schemaComposer.Query.addFields({
      [fieldName]: typeComposer.getResolver('findOne'),
      [allFieldName]: typeComposer.getResolver('findManyPaginated')
    })

    // TODO: remove this before 1.0
    if (allFieldName !== `all${typeName}`) {
      schemaComposer.Query.addFields({
        [`all${typeName}`]: {
          ...typeComposer.getResolver('findManyPaginated'),
          deprecationReason: `Use '${allFieldName}' instead.`
        }
      })
    }
  }

  createBelongsTo(schemaComposer, store)

  return schema
}

function createTypeComposers (schemaComposer, store) {
  for (const typeName in store.collections) {
    if (schemaComposer.has(typeName)) {
      if (!schemaComposer.get(typeName).hasInterface('Node')) {
        throw new Error(
          `The '${typeName}' GraphQL type must implement the 'Node' interface`
        )
      }
    }

    const typeComposer = schemaComposer.getOrCreateOTC(typeName)
    const connectionTypeName = `${typeName}Connection`
    const edgeTypeName = `${typeName}Edge`

    schemaComposer.createObjectTC({
      name: edgeTypeName,
      interfaces: ['NodeConnectionEdge'],
      fields: {
        node: typeName,
        next: typeName,
        previous: typeName
      }
    })

    schemaComposer.createObjectTC({
      name: connectionTypeName,
      interfaces: ['NodeConnection'],
      fields: {
        totalCount: 'Int!',
        pageInfo: 'PageInfo!',
        edges: [edgeTypeName]
      }
    })

    typeComposer.addInterface('Node')
    typeComposer.setIsTypeOf(node => node.internal && node.internal.typeName === typeName)
  }
}

function inferFields (typeComposer, contentType) {
  const extensions = typeComposer.getExtensions()

  // user defined schemas must enable inference
  if (extensions.isUserDefined && !extensions.infer) {
    return {}
  }

  return createFieldDefinitions(contentType.data())
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

  typeComposer.addFields(fieldTypes)
  typeComposer.addFields({ id: 'ID!' })
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

const {
  createFindOneResolver,
  createFindManyPaginatedResolver,
  createReferenceOneResolver,
  createReferenceManyResolver
} = require('./resolvers')

function createResolvers (typeComposer, contentType) {
  const inputTypeComposer = typeComposer.getInputTypeComposer()
  const typeName = typeComposer.getTypeName()

  const { defaultSortBy, defaultSortOrder } = contentType.options

  typeComposer.addResolver({
    name: 'findOne',
    type: typeName,
    args: {
      id: 'ID',
      path: 'String',
      nullable: {
        type: 'Boolean',
        defaultValue: false,
        description: 'Will return an error if not nullable.',
        deprecationReason: 'Will always return null if not found.'
      }
    },
    resolve: createFindOneResolver(typeComposer)
  })

  typeComposer.addResolver({
    name: 'findManyPaginated',
    type: `${typeName}Connection`,
    args: {
      sortBy: { type: 'String', defaultValue: defaultSortBy },
      order: { type: 'SortOrder', defaultValue: defaultSortOrder },
      perPage: { type: 'Int', description: `Defaults to ${PER_PAGE} when page is provided.` },
      skip: { type: 'Int', defaultValue: 0 },
      limit: { type: 'Int' },
      page: { type: 'Int' },
      sort: { type: '[SortArgument]' },
      filter: {
        type: inputTypeComposer,
        description: `Filter for ${typeName} nodes.`
      },

      // TODO: remove before 1.0
      regex: { type: 'String', deprecationReason: 'Use filter instead.' }
    },
    resolve: createFindManyPaginatedResolver(typeComposer)
  })

  typeComposer.addResolver({
    name: 'findManyPaginated',
    type: `${typeName}Connection`,
    args: {
      sortBy: { type: 'String', defaultValue: defaultSortBy },
      order: { type: 'SortOrder', defaultValue: defaultSortOrder },
      perPage: { type: 'Int', description: `Defaults to ${PER_PAGE} when page is provided.` },
      skip: { type: 'Int', defaultValue: 0 },
      limit: { type: 'Int' },
      page: { type: 'Int' },
      sort: { type: '[SortArgument]' },
      filter: {
        type: inputTypeComposer,
        description: `Filter for ${typeName} nodes.`
      },

      // TODO: remove before 1.0
      regex: { type: 'String', deprecationReason: 'Use filter instead.' }
    },
    resolve: createFindManyPaginatedResolver(typeComposer)
  })

  typeComposer.addResolver({
    name: 'findManyPaginated',
    type: `${typeName}Connection`,
    args: {
      sortBy: { type: 'String', defaultValue: defaultSortBy },
      order: { type: 'SortOrder', defaultValue: defaultSortOrder },
      perPage: { type: 'Int', description: `Defaults to ${PER_PAGE} when page is provided.` },
      skip: { type: 'Int', defaultValue: 0 },
      limit: { type: 'Int' },
      page: { type: 'Int' },
      sort: { type: '[SortArgument]' },
      filter: {
        type: inputTypeComposer,
        description: `Filter for ${typeName} nodes.`
      },

      // TODO: remove before 1.0
      regex: { type: 'String', deprecationReason: 'Use filter instead.' }
    },
    resolve: createFindManyPaginatedResolver(typeComposer)
  })

  typeComposer.addResolver({
    name: 'referenceOne',
    type: typeName,
    resolve: createReferenceOneResolver(typeComposer)
  })

  typeComposer.addResolver({
    name: 'referenceMany',
    type: [typeName],
    resolve: createReferenceManyResolver(typeComposer)
  })
}

function createRefFields ({
  schemaComposer,
  typeComposer,
  contentType,
  fieldDefs,
  typeNames
}) {
  if (isEmpty(contentType.options.refs)) return {}

  const refs = mapValues(contentType.options.refs, ({ typeName }, fieldName) => {
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

  typeComposer.addFields(refs)
}
