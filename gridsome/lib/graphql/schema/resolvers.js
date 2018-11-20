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

  const applyArgs = chain => {
    if (args.sortBy) chain = chain.simplesort(args.sortBy, args.order === -1)
    if (args.skip) chain = chain.offset(args.skip)
    if (args.limit) chain = chain.limit(args.limit)

    return chain
  }

  // search for multiple node types by filtering the global
  // node index before joining each node type collections
  if (Array.isArray(typeName)) {
    const options = { removeMeta: true }
    const indexQuery = { ...query, type: 'node', typeName: { $in: typeName }}
    const mapper = (left, right) => ({ ...left, ...right })
    let nodeIndex = context.store.index.chain().find(indexQuery)

    for (let i = 0, l = typeName.length; i < l; i++) {
      const { collection } = context.store.getContentType(typeName[i])
      nodeIndex = nodeIndex.eqJoin(collection, 'uid', 'uid', mapper, options)
    }

    const result = applyArgs(nodeIndex).data()

    return isList ? result : result[0]
  }

  const { collection } = context.store.getContentType(typeName)

  return isList
    ? applyArgs(collection.chain().find(query)).data()
    : collection.findOne(query)
}

module.exports = {
  fieldResolver,
  refResolver
}
