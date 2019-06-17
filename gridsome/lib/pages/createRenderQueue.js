const { createQueryVariables } = require('./utils')
const { toFilterArgs } = require('../graphql/filters/query')
const { createPagedNodeEdges } = require('../graphql/nodes/utils')
const { createBelongsToKey } = require('../graphql/nodes/belongsTo')

function createRenderQueue (renderQueue, { pages, store, schema }) {
  const queue = renderQueue.slice()

  for (const page of pages.data()) {
    if (page.query.paginate) {
      const totalPages = calcTotalPages(page, store, schema)

      for (let i = 1; i <= totalPages; i++) {
        queue.push(createRenderEntry(page, i))
      }
    } else {
      queue.push(createRenderEntry(page))
    }
  }

  return queue
}

function calcTotalPages (page, store, schema) {
  const { belongsTo, fieldName, typeName, perPage, skip, limit } = page.query.paginate
  const gqlField = schema.getComposer().Query.getField(fieldName)
  const { collection } = store.getContentType(typeName)

  const filterQuery = toFilterArgs(page.query.filters, belongsTo
    ? gqlField.type.getFields().belongsTo.args.filter.type
    : gqlField.args.filter.type
  )

  let chain

  if (belongsTo) {
    const { id, path } = belongsTo
    const node = id ? collection.by('id', id) : collection.by('path', path)
    const key = createBelongsToKey(node)
    const query = { [key]: { $eq: true }}

    Object.assign(query, filterQuery)

    chain = store.chainIndex(query)
  } else {
    chain = collection.chain().find(filterQuery)
  }

  const args = { page: 1, perPage, skip, limit }
  const res = createPagedNodeEdges(chain, args)

  return res.pageInfo.totalPages
}

function createRenderEntry (page, currentPage = undefined) {
  const segments = page.internal.path.segments.slice()

  if (currentPage > 1) {
    segments.push(currentPage)
  }

  const originalPath = `/${segments.join('/')}`

  return {
    route: page.route,
    path: `/${segments.join('/')}`,
    component: page.component,
    context: page.context,
    query: page.query.document ? {
      document: page.query.document,
      variables: createQueryVariables(page, currentPage)
    } : null,
    internal: {
      originalPath,
      pathSegments: segments
    }
  }
}

module.exports = createRenderQueue
