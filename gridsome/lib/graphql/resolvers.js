const { dateType } = require('./types/date')
const { fileType } = require('./types/file')
const { imageType } = require('./types/image')
const { applyChainArgs, createSortOptions } = require('./nodes/utils')

const scalarTypeResolvers = {
  Date: dateType,
  File: fileType,
  Image: imageType
}

function createRefResolver ({ typeName, isList = false }) {
  return function refResolver (obj, args, context, { fieldName }) {
    const fieldValue = obj[fieldName]

    if (!fieldValue) return isList ? [] : null

    const { id } = fieldValue
    const sort = createSortOptions(args)
    const query = {}
    let chain

    if (fieldValue.hasOwnProperty('typeName') && !fieldValue.typeName) {
      return isList ? [] : null
    }

    if (id) {
      query.id = Array.isArray(id) ? { $in: id } : id
      query['internal.typeName'] = Array.isArray(typeName) ? { $in: typeName } : typeName
    } else if (Array.isArray(fieldValue)) {
      query.$or = fieldValue
    } else {
      return isList ? [] : null
    }

    if (Array.isArray(typeName)) {
      chain = context.store.chainIndex(query)
    } else {
      const { collection } = context.store.getContentType(typeName)
      chain = collection.chain().find(query)

      for (const [fieldName] of sort) {
        collection.ensureIndex(fieldName)
      }
    }

    return isList
      ? applyChainArgs(chain, args, sort).data()
      : chain.data()[0]
  }
}

module.exports = {
  scalarTypeResolvers,
  createRefResolver
}
