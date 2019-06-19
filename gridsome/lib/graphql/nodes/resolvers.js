const { isRefField } = require('../utils')
const { toFilterArgs } = require('../filters/query')

const {
  applyChainArgs,
  createSortOptions,
  createPagedNodeEdges
} = require('./utils')

exports.createFindOneResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function findOneResolver ({ args, context }) {
    const { collection } = context.store.getContentType(typeName)
    let node = null

    if (args.id) {
      node = collection.by('id', args.id)
    } else if (args.path) {
      // must use collection.findOne() here because
      // collection.by() doesn't update after changes
      node = collection.findOne({ path: args.path })
    }

    return node || null
  }
}

exports.createFindManyPaginatedResolver = function (typeComposer) {
  const inputTypeComposer = typeComposer.getInputTypeComposer()
  const typeName = typeComposer.getTypeName()

  return function findManyPaginatedResolver ({ args, context }) {
    const { collection } = context.store.getContentType(typeName)
    const sort = createSortOptions(args)
    const query = {}

    for (const [fieldName] of sort) {
      collection.ensureIndex(fieldName)
    }

    if (args.filter) {
      Object.assign(query, toFilterArgs(args.filter, inputTypeComposer))
    }

    const chain = collection.chain().find(query)

    return createPagedNodeEdges(chain, args, sort)
  }
}

exports.createReferenceOneResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceOneResolver ({ source, args, context, info }) {
    const contentType = context.store.getContentType(typeName)
    const fieldValue = source[info.fieldName]
    const referenceValue = isRefField(fieldValue)
      ? fieldValue.id
      : fieldValue

    if (!fieldValue) return null

    const { by = 'id' } = args

    if (by === 'id') {
      return contentType.getNode(referenceValue)
    } else {
      return contentType.findNode({ [by]: referenceValue })
    }
  }
}

exports.createReferenceManyResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceManyResolver ({ source, args, context, info }) {
    const contentType = context.store.getContentType(typeName)
    const fieldValue = source[info.fieldName]
    const referenceValues = Array.isArray(fieldValue)
      ? fieldValue.map(value => isRefField(value) ? value.id : value)
      : []

    if (referenceValues.length < 1) return []

    const { by = 'id' } = args

    return contentType.findNodes({
      [by]: { $in: referenceValues }
    })
  }
}

exports.createReferenceManyAdvancedResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceManyAdvancedResolver ({ source, args, context, info }) {
    const { collection } = context.store.getContentType(typeName)
    const fieldValue = source[info.fieldName]
    const referenceValues = Array.isArray(fieldValue)
      ? fieldValue.map(value => isRefField(value) ? value.id : value)
      : []

    if (referenceValues.length < 1) return []

    const sort = createSortOptions(args)
    const { by = 'id' } = args

    for (const [fieldName] of sort) {
      collection.ensureIndex(fieldName)
    }

    const chain = collection.chain().find({
      [by]: { $in: referenceValues }
    })

    return applyChainArgs(chain, args, sort).data()
  }
}

