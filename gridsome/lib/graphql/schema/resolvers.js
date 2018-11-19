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

  // search for multiple node types by filtering the global
  // node index before joining each node type collections
  if (Array.isArray(typeName)) {
    const options = { removeMeta: true }
    const indexQuery = { ...query, typeName: { $in: typeName }}
    const mapper = (left, right) => ({ ...left, ...right })
    let nodeIndex = context.store.nodeIndex.chain().find(indexQuery)

    typeName.forEach(typeName => {
      const { collection } = context.store.getContentType(typeName)
      nodeIndex = nodeIndex.eqJoin(collection, 'uid', 'uid', mapper, options)
    })

    const result = nodeIndex
      .simplesort(args.sortBy, args.order === -1)
      .offset(args.skip)
      .limit(args.limit)
      .data()

    return isList ? result : result[0]
  }

  const { collection } = context.store.getContentType(typeName)

  if (isList) {
    return collection
      .chain()
      .find(query)
      .simplesort(args.sortBy, args.order === -1)
      .offset(args.skip)
      .limit(args.limit)
      .data()
  }

  return collection.findOne(query)
}

module.exports = {
  fieldResolver,
  refResolver
}
