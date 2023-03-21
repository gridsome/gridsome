const { isRefField } = require('../../store/utils')
const { toFilterArgs } = require('../filters/query')
const { trimEnd } = require('lodash')

const {
  applyChainArgs,
  createSortOptions,
  createPagedNodeEdges
} = require('./utils')

exports.createFindOneResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function findOneResolver ({ args, context }) {
    const { collection } = context.store.getCollection(typeName)
    let node = null

    if (args.id) {
      node = collection.by('id', args.id)
    } else if (args.path) {
      const path = trimEnd(args.path, '/') + '/'
      const path2 = trimEnd(args.path, '/') || '/'
      node = collection.findOne({
        $or: [
          { path },
          { path: path2 }
        ]
      })
    }

    return node || null
  }
}

exports.createFindManyPaginatedResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function findManyPaginatedResolver ({ args, context }) {
    const { collection } = context.store.getCollection(typeName)
    const sort = createSortOptions(args)
    const query = {}

    for (const [fieldName] of sort) {
      collection.ensureIndex(fieldName)
    }

    if (args.filter) {
      const inputTypeComposer = typeComposer.getInputTypeComposer()
      Object.assign(query, toFilterArgs(args.filter, inputTypeComposer))
    }

    const chain = collection.chain().find(query)

    return createPagedNodeEdges(chain, args, sort)
  }
}

exports.createReferenceOneResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceOneResolver ({ source, args, context, info }) {
    const collection = context.store.getCollection(typeName)
    const fieldValue = source[info.fieldName]
    const referenceValue = isRefField(fieldValue)
      ? fieldValue.id
      : fieldValue

    if (!fieldValue) return null

    const { by = 'id' } = args

    if (by === 'id') {
      return collection.getNodeById(referenceValue)
    } else {
      return collection.findNode({ [by]: referenceValue })
    }
  }
}

exports.createReferenceManyResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceManyResolver ({ source, args, context, info }) {
    const collection = context.store.getCollection(typeName)
    const fieldValue = source[info.fieldName]
    let referenceValues = Array.isArray(fieldValue)
      ? fieldValue.map(value => isRefField(value) ? value.id : value)
      : []

    // createReference('Post', ['1', '2', '3'])
    if (isRefField(fieldValue) && Array.isArray(fieldValue.id)) {
      referenceValues = fieldValue.id
    }

    if (referenceValues.length < 1) return []

    const { by = 'id' } = args

    return collection.findNodes({
      [by]: { $in: referenceValues }
    })
  }
}

exports.createReferenceManyAdvancedResolver = function (typeComposer) {
  const typeName = typeComposer.getTypeName()

  return function referenceManyAdvancedResolver ({ source, args, context, info }) {
    const { collection } = context.store.getCollection(typeName)
    const fieldValue = source[info.fieldName]
    let referenceValues = Array.isArray(fieldValue)
      ? fieldValue.map(value => isRefField(value) ? value.id : value)
      : []

    // createReference('Post', ['1', '2', '3'])
    if (isRefField(fieldValue) && Array.isArray(fieldValue.id)) {
      referenceValues = fieldValue.id
    }

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

exports.createReferenceOneUnionResolver = function () {
  return function referenceOneUnionResolver (source, args, context, info) {
    const fieldValue = source[info.fieldName]

    if (!fieldValue) return null

    return isRefField(fieldValue)
      ? context.store.getNode(fieldValue.typeName, fieldValue.id)
      : context.store.getNodeByUid(fieldValue)
  }
}

exports.createReferenceManyUnionResolver = function () {
  return function referenceManyUnionResolver (source, args, context, info) {
    const fieldValue = source[info.fieldName] || []

    if (fieldValue.length < 1) return []

    return fieldValue.map(fieldValue => {
      return isRefField(fieldValue)
        ? context.store.getNode(fieldValue.typeName, fieldValue.id)
        : context.store.getNodeByUid(fieldValue)
    })
  }
}
