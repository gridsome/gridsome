function fieldResolver (obj, args, ctx, { fieldName }) {
  return obj.hasOwnProperty('$loki') // the node object
    ? obj.fields[fieldName]
    : obj[fieldName]
}

function refResolver (obj, args, context, info) {
  const res = fieldResolver(obj, args, context, info)

  if (!res) return null

  const { typeName, key, value } = res
  const isList = Array.isArray(value)
  const query = { [key || 'id']: isList ? { $in: value } : value }

  if (Array.isArray(typeName)) {
    // TODO: search multiple collections
    return isList ? [] : null
  }

  const { collection } = context.store.getContentType(typeName)

  return isList
    ? collection.find(query)
    : collection.findOne(query)
}

module.exports = {
  fieldResolver,
  refResolver
}
