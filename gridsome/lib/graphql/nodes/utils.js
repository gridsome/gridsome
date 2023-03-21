const { PER_PAGE } = require('../../utils/constants')

exports.applyChainArgs = function (chain, args = {}, sort = []) {
  if (sort.length) chain = applySort(chain, sort)
  if (args.skip) chain = chain.offset(args.skip)
  if (args.limit) chain = chain.limit(args.limit)

  return chain
}

exports.createPagedNodeEdges = function (chain, args = {}, sort = []) {
  let { limit: limitArg, perPage: perPageArg } = args
  const isPaged = typeof args.page !== 'undefined'

  // TODO: warn when limiting with perPage argument
  if (perPageArg && !isPaged && !limitArg) {
    limitArg = perPageArg
    perPageArg = null
  }

  const limit = limitArg || Number.MAX_SAFE_INTEGER
  const page = Math.max(args.page || 1, 1)
  const skip = Math.max(args.skip || 0, 0)
  const totalCount = chain.data().length
  const maxResults = Math.max(totalCount - skip)
  const totalItemsCount = Math.min(limit, maxResults)

  const perPage = isPaged
    ? Math.max(perPageArg || PER_PAGE, 1)
    : args.limit
      ? args.limit
      : totalItemsCount

  chain = applySort(chain, sort)

  if (isPaged) {
    chain = chain.offset(((page - 1) * perPage) + skip)
    chain = chain.limit(perPage)
  } else {
    chain = chain.offset(skip)
    chain = chain.limit(limit)
  }

  const nodes = chain.data()
  const currentPage = page
  const totalPages = Math.max(Math.ceil(totalItemsCount / perPage) || 1, 1)
  const hasPreviousPage = page > 1
  const hasNextPage = page < totalPages

  return {
    totalCount,
    edges: nodes.map((node, index) => ({
      node,
      next: nodes[index + 1],
      previous: nodes[index - 1]
    })),
    pageInfo: {
      perPage,
      totalPages,
      currentPage,
      hasPreviousPage,
      hasNextPage,
      totalItems: totalItemsCount,
      isFirst: hasPreviousPage === false,
      isLast: hasNextPage === false
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

