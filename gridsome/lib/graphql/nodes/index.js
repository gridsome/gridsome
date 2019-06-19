const graphql = require('../graphql')
const camelCase = require('camelcase')
const { createBelongsTo } = require('./belongsTo')
const { PER_PAGE } = require('../../utils/constants')
const { createFilterInput } = require('../filters/input')
const createFieldDefinitions = require('../createFieldDefinitions')
const { createFieldTypes } = require('../createFieldTypes')
const { SORT_ORDER } = require('../../utils/constants')
const { isRefFieldDefinition } = require('../utils')

const { mapValues, isEmpty, isPlainObject } = require('lodash')

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

    createFields(schemaComposer, typeComposer, contentType)
    createFilterInput(schemaComposer, typeComposer)
    createResolvers(typeComposer, contentType)
    createReferenceFields(schemaComposer, typeComposer, contentType)
    createThirdPartyFields(typeComposer, contentType)

    const fieldName = camelCase(typeName)
    const allFieldName = camelCase(`all ${typeName}`)

    schemaComposer.Query.addFields({
      [fieldName]: typeComposer.getResolver('findOne'),
      [allFieldName]: typeComposer.getResolver('findManyPaginated')
    })

    // TODO: remove this field before 1.0
    const oldAllFieldName = `all${typeName}`

    if (
      allFieldName !== oldAllFieldName &&
      !schemaComposer.Query.hasField(oldAllFieldName)
    ) {
      schemaComposer.Query.setField(oldAllFieldName, {
        ...typeComposer.getResolver('findManyPaginated'),
        deprecationReason: `Use '${allFieldName}' instead.`
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
          `The '${typeName}' GraphQL type must implement the 'Node' interface. Example:\n\n` +
          `type ${typeName} implements Node {\n` +
          `  title: String!\n` +
          `}\n`
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
    typeComposer.setIsTypeOf(node =>
      node.internal && node.internal.typeName === typeName
    )
  }
}

function createFields (schemaComposer, typeComposer, contentType) {
  const typeName = typeComposer.getTypeName()
  const fieldDefs = inferFields(typeComposer, contentType)
  const fieldTypes = createFieldTypes(schemaComposer, fieldDefs, typeName)

  processInferredFields(typeComposer, fieldDefs, fieldTypes)

  for (const fieldName in fieldTypes) {
    if (!typeComposer.hasField(fieldName)) {
      typeComposer.setField(fieldName, fieldTypes[fieldName])
    }
  }

  typeComposer.setField('id', 'ID!')
}

function inferFields (typeComposer, contentType) {
  const extensions = typeComposer.getExtensions()

  // user defined schemas must enable inference
  if (extensions.isUserDefined && !extensions.infer) {
    return {}
  }

  return createFieldDefinitions(contentType.data())
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

function createThirdPartyFields (typeComposer, contentType) {
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

  typeComposer.addFields(fields)
}

const {
  createFindOneResolver,
  createFindManyPaginatedResolver,
  createReferenceOneResolver,
  createReferenceManyResolver,
  createReferenceManyAdvancedResolver
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
      }
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

  typeComposer.addResolver({
    name: 'referenceManyAdvanced',
    type: [typeName],
    args: {
      sortBy: { type: 'String' },
      order: { type: 'SortOrder', defaultValue: SORT_ORDER },
      skip: { type: 'Int', defaultValue: 0 },
      sort: { type: '[SortArgument]' },
      limit: { type: 'Int' }
    },
    resolve: createReferenceManyAdvancedResolver(typeComposer)
  })
}

function createReferenceFields (schemaComposer, typeComposer, contentType) {
  if (isEmpty(contentType.options.refs)) return

  const refs = mapValues(contentType.options.refs, ({ typeName }, fieldName) => {
    const refTypeComposer = schemaComposer.get(typeName)

    return typeComposer.isFieldPlural(fieldName)
      ? refTypeComposer.getResolver('referenceMany')
      : refTypeComposer.getResolver('referenceOne')
  })

  typeComposer.addFields(refs)
}
