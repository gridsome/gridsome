const { safeKey } = require('../../utils')
const { NODE_FIELDS, SORT_ORDER } = require('../../utils/constants')

exports.applyChainArgs = function (chain, args) {
  chain = applyChainSort(chain, args)

  if (args.skip) chain = chain.offset(args.skip)
  if (args.limit) chain = chain.limit(args.limit)

  return chain
}

exports.createBelongsToKey = function (node) {
  return `belongsTo.${node.typeName}.${safeKey(node.id)}`
}

exports.createPagedNodeEdges = function (chain, args) {
  const page = Math.max(args.page, 1) // ensure page higher than 0
  const perPage = Math.max(args.perPage, 1) // ensure page higher than 1
  const totalNodes = chain.data().length
  const totalCount = Math.max(totalNodes - args.skip, 0)

  chain = applyChainSort(chain, args)
  chain = chain.offset(((page - 1) * perPage) + args.skip)
  chain = chain.limit(perPage)

  const nodes = chain.data()
  const currentPage = page
  const totalPages = Math.max(Math.ceil(totalCount / perPage), 1)
  const isLast = page >= totalPages
  const isFirst = page <= 1

  return {
    totalCount,
    edges: nodes.map((node, index) => ({
      node,
      next: nodes[index + 1],
      previous: nodes[index - 1]
    })),
    pageInfo: {
      currentPage,
      totalPages,
      isFirst,
      isLast
    }
  }
}

function createFieldKey (name) {
  return !NODE_FIELDS.includes(name) ? `fields.${name}` : name
}

function applyChainSort (chain, { sort, sortBy, order }) {
  if (sort && sort.length) {
    return chain.compoundsort(sort.map(({ by, order }) => {
      return [createFieldKey(by), order === SORT_ORDER]
    }))
  } else if (sortBy) {
    return chain.simplesort(createFieldKey(sortBy), order === SORT_ORDER)
  }

  return chain
}
