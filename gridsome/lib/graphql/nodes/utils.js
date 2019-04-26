const { safeKey } = require('../../utils')

exports.applyChainArgs = function (chain, args = {}, sort = []) {
  chain = applySort(chain, sort)

  if (args.skip) chain = chain.offset(args.skip)
  if (args.limit) chain = chain.limit(args.limit)

  return chain
}

exports.createBelongsToKey = function (node) {
  return `belongsTo.${node.typeName}.${safeKey(node.id)}`
}

exports.createPagedNodeEdges = function (chain, args = {}, sort = []) {
  const page = Math.max(args.page, 1) // ensure page higher than 0
  const perPage = Math.max(args.perPage, 1) // ensure page higher than 1
  const totalNodes = chain.data().length
  const totalCount = Math.max(totalNodes - args.skip, 0)

  chain = applySort(chain, sort)
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

exports.createSortOptions = function ({ sort, sortBy, order }) {
  if (sort && sort.length) {
    return sort.map(({ by, order }) => [by, order === 'DESC'])
  } else if (sortBy) {
    return [[sortBy, order === 'DESC']]
  }

  return []
}

function applySort (chain, sort = []) {
  if (sort.length > 1) return chain.compoundsort(sort)
  else if (sort.length) return chain.simplesort(...sort[0])

  return chain
}

