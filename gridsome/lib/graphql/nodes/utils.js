const { safeKey } = require('../../utils')
const { info } = require('../../utils/log')
const { NODE_FIELDS } = require('../../utils/constants')

exports.applyChainArgs = function (chain, args) {
  if (args.sortBy) chain = chain.simplesort(args.sortBy, args.order === -1)
  if (args.skip) chain = chain.offset(args.skip)
  if (args.limit) chain = chain.limit(args.limit)

  return chain
}

exports.createBelongsToKey = function (node) {
  return `belongsTo.${node.typeName}.${safeKey(node.id)}`
}

exports.createPagedNodeEdges = function (chain, args) {
  const { order, skip } = args
  const page = Math.max(args.page, 1) // ensure page higher than 0
  const perPage = Math.max(args.perPage, 1) // ensure page higher than 1
  const totalNodes = chain.data().length
  const totalCount = Math.max(totalNodes - skip, 0)
  let sortBy = args.sortBy

  if (!NODE_FIELDS.includes(sortBy)) {
    // TODO: remove check before 1.0
    if (sortBy.startsWith('fields.')) {
      info(`Do not prefix custom fields in sortBy argument with "fields."`)
    } else {
      sortBy = `fields.${sortBy}`
    }
  }

  chain = chain.simplesort(sortBy, order === 'DESC')
  chain = chain.offset(((page - 1) * perPage) + skip)
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
