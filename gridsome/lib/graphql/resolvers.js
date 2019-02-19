const { applyChainArgs } = require('./nodes/utils')

function fieldResolver (obj, args, ctx, { fieldName }) {
  return obj.hasOwnProperty('$loki') // the node object
    ? obj.fields[fieldName]
    : obj[fieldName]
}

function createRefResolver ({ typeName, isList = false }) {
  return function refResolver (obj, args, context, info) {
    const fieldValue = fieldResolver(obj, args, context, info)

    if (!fieldValue) return isList ? [] : null

    const { id } = fieldValue
    const query = {}
    let chain

    if (id) {
      query.id = Array.isArray(id) ? { $in: id } : id
      query.typeName = Array.isArray(typeName) ? { $in: typeName } : typeName
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
    }

    return isList
      ? applyChainArgs(chain, args).data()
      : chain.data()[0]
  }
}

module.exports = {
  fieldResolver,
  createRefResolver
}
