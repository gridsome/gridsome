const { isRefField } = require('../utils')
const { toFilterArgs } = require('../filters/query')
const { createPagedNodeEdges, createSortOptions } = require('./utils')

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

    // _, { regex, filter, ...args }, { store }

    for (const [fieldName] of sort) {
      collection.ensureIndex(fieldName)
    }

    if (args.regex) {
      // TODO: remove before 1.0
      query.path = { $regex: new RegExp(args.regex) }
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

  return function referenceOneResolver (obj, { by = 'id' }, ctx, info) {
    const contentType = ctx.store.getContentType(typeName)
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
}

exports.createReferenceManyResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceManyResolver (obj, { by = 'id' }, ctx, info) {
    const contentType = ctx.store.getContentType(typeName)
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
