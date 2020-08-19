const graphql = require('../graphql')
const camelCase = require('camelcase')
const { createBelongsTo } = require('./belongsTo')
const { PER_PAGE } = require('../../utils/constants')
const { createFilterInput } = require('../filters/input')
const createFieldDefinitions = require('../createFieldDefinitions')
const { createFieldTypes } = require('../createFieldTypes')
const { isRefFieldDefinition, createTypeName } = require('../utils')
const { isRefField } = require('../../store/utils')

const {
  ObjectTypeComposer,
  NonNullComposer,
  ThunkComposer,
  ListComposer,
  unwrapTC
} = require('graphql-compose')

const { omit, mapValues, isEmpty, isPlainObject } = require('lodash')

module.exports = function createNodesSchema (schemaComposer, store) {
  const typeNames = Object.keys(store.collections)
  const schema = {}

  schemaComposer.createEnumTC({
    name: 'TypeName',
    values: typeNames.reduce((acc, value) => (acc[value] = { value } && acc), {})
  })

  createTypeComposers(schemaComposer, store)
  createResolvers(schemaComposer, store)
  createFields(schemaComposer, store)

  for (const typeName of typeNames) {
    const collection = store.getCollection(typeName)
    const typeComposer = schemaComposer.get(typeName)

    createFilterInput(schemaComposer, typeComposer)
    createThirdPartyFields(typeComposer, collection)

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
        deprecationReason: `Use Query.${allFieldName} instead.`
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

    typeComposer.setField('id', 'ID!')
  }
}

function createFields (schemaComposer, store) {
  for (const typeName in store.collections) {
    const collection = store.getCollection(typeName)
    const typeComposer = schemaComposer.get(typeName)
    const fieldDefs = inferFields(typeComposer, collection)
    const fieldTypes = createFieldTypes(schemaComposer, fieldDefs, typeName)

    createInferredFields(typeComposer, fieldDefs, fieldTypes)
    createReferenceFields(schemaComposer, typeComposer, collection)
  }
}

function inferFields (typeComposer, collection) {
  const extensions = typeComposer.getExtensions()

  // user defined schemas must enable inference
  if (extensions.isCustomType && !extensions.infer) {
    return {}
  }

  return createFieldDefinitions(collection.data(), {
    camelCase: collection._camelCasedFieldNames
  })
}

function createInferredFields (typeComposer, fieldDefs, fieldTypes) {
  for (const key in fieldDefs) {
    const options = fieldDefs[key]
    const fieldType = fieldTypes[options.fieldName]

    if (!typeComposer.hasField(options.fieldName)) {
      typeComposer.setField(options.fieldName, fieldType)
      typeComposer.setFieldExtensions(options.fieldName, options.extensions)

      if (isPlainObject(options.value) && !isRefFieldDefinition(options.value)) {
        addFieldExtensions(typeComposer, options.fieldName, options.value)
      }
    }
  }
}

function addFieldExtensions (typeComposer, fieldName, fieldDefs) {
  const fieldTypeComposer = typeComposer.getFieldTC(fieldName)

  if (fieldTypeComposer instanceof ObjectTypeComposer) {
    for (const key in fieldDefs) {
      const { fieldName, extensions, value } = fieldDefs[key]
      fieldTypeComposer.extendFieldExtensions(fieldName, extensions)

      if (isPlainObject(value) && !isRefFieldDefinition(value)) {
        addFieldExtensions(fieldTypeComposer, fieldName, value)
      }
    }
  }
}

function createThirdPartyFields (typeComposer, collection) {
  const context = { collection, graphql, contentType: collection }
  const fields = {}

  for (const mimeType in collection._mimeTypes) {
    const transformer = collection._mimeTypes[mimeType]

    if (typeof transformer.extendNodeType === 'function') {
      Object.assign(fields, transformer.extendNodeType(context))
    }
  }

  for (const fieldName in collection._fields) {
    const field = collection._fields[fieldName]

    if (typeof field === 'function') {
      fields[fieldName] = field(context)
    }
  }

  for (const fieldName in fields) {
    const extensions = typeComposer.hasField(fieldName)
      ? typeComposer.getFieldExtensions(fieldName)
      : {}

    typeComposer.setField(fieldName, fields[fieldName])
    typeComposer.extendFieldExtensions(fieldName, extensions)
  }
}

const {
  createFindOneResolver,
  createFindManyPaginatedResolver,
  createReferenceOneResolver,
  createReferenceManyResolver,
  createReferenceManyAdvancedResolver
} = require('./resolvers')

function createResolvers (schemaComposer, store) {
  for (const typeName in store.collections) {
    const typeComposer = schemaComposer.get(typeName)
    const collection = store.getCollection(typeName)

    createTypeResolvers(typeComposer, collection)
  }
}

function createTypeResolvers (typeComposer, collection) {
  const typeName = typeComposer.getTypeName()

  const { _defaultSortBy, _defaultSortOrder } = collection

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
      sortBy: { type: 'String', defaultValue: _defaultSortBy },
      order: { type: 'SortOrder', defaultValue: _defaultSortOrder },
      perPage: { type: 'Int', description: `Defaults to ${PER_PAGE} when page is provided.` },
      skip: { type: 'Int', defaultValue: 0 },
      limit: { type: 'Int' },
      page: { type: 'Int' },
      sort: { type: '[SortArgument]' },
      filter: {
        type: `${typeName}FilterInput`,
        description: `Filter for ${typeName} nodes.`
      }
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
      order: { type: 'SortOrder', defaultValue: _defaultSortOrder },
      skip: { type: 'Int', defaultValue: 0 },
      sort: { type: '[SortArgument]' },
      limit: { type: 'Int' }
    },
    resolve: createReferenceManyAdvancedResolver(typeComposer)
  })
}

function createReferenceFields (schemaComposer, typeComposer, collection) {
  if (isEmpty(collection._refs)) return

  const fields = mapValues(collection._refs, ({ typeName }, fieldName) => {
    const isList = typeComposer.hasField(fieldName)
      ? typeComposer.isFieldPlural(fieldName)
      : false

    if (Array.isArray(typeName)) {
      const unionTypeComposer = schemaComposer.createUnionTC({
        name: createTypeName(typeComposer.getTypeName(), fieldName + 'InferRef'),
        description: `Reference to ${typeName.join(', ')} nodes`,
        interfaces: ['Node'],
        types: () => typeName
      })

      return {
        type: isList
          ? [unionTypeComposer]
          : unionTypeComposer,
        resolve: isList
          ? createReferenceManyUnionResolver(typeName)
          : createReferenceOneUnionResolver(typeName)
      }
    } else {
      const { typeMapper } = schemaComposer
      const refTypeComposer = typeMapper.convertSDLWrappedTypeName(typeName)
      const otherTypeComposer = unwrapTC(refTypeComposer)
      const resolver = isList || isListTC(refTypeComposer)
        ? otherTypeComposer.getResolver('referenceManyAdvanced')
        : otherTypeComposer.getResolver('referenceOne')

      const clonedResolver = resolver.clone()

      // TODO: warn if inferred field type is a list but the typeName is not.
      if (!isList && typeComposer.hasField(fieldName)) {
        clonedResolver.setType(refTypeComposer)
      }

      return clonedResolver
    }
  })

  typeComposer.addFields(fields)

  mapValues(collection._refs, ({ extensions = {}}, fieldName) => {
    if (typeComposer.hasField(fieldName)) {
      typeComposer.extendFieldExtensions(fieldName, extensions)
    }
  })
}

function isListTC (anyTC) {
  if (
    anyTC instanceof NonNullComposer ||
    anyTC instanceof ThunkComposer
  ) {
    return isListTC(anyTC.ofType)
  }

  return anyTC instanceof ListComposer
}

function createReferenceManyUnionResolver (typeNames) {
    return (src, args, ctx, info) => {
      const fieldValue = src[info.fieldName] || []

      if (fieldValue.length && isRefField(fieldValue[0])) {
        return fieldValue.map(value => {
          return ctx.store.getNode(value.typeName, value.id)
        }).filter(Boolean)
      }

      const query = { typeName: { $in: typeNames } }
      const chain = ctx.store.chainIndex(query, false)
      const results = chain.find({ id: { $in: fieldValue }}).map(entry => {
        return omit(ctx.store.getNodeByUid(entry.uid), ['$loki'])
      })

      return results.data().filter(Boolean)
    }
}

function createReferenceOneUnionResolver (typeNames) {
  return (src, args, ctx, info) => {
    const fieldValue = src[info.fieldName] || null

    if (isRefField(fieldValue)) {
      return ctx.store.getNode(fieldValue.typeName, fieldValue.id)
    }

    const query = { typeName: { $in: typeNames } }
    const chain = ctx.store.chainIndex(query, false)
    const results = chain.find({ id: { $in: fieldValue } }).map(entry => {
      return omit(ctx.store.getNodeByUid(entry.uid), ['$loki'])
    })

    return results.data().shift()
  }
}
