const { createQueryVariables } = require('./utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
const { createBelongsToKey, createPagedNodeEdges } = require('../graphql/nodes/utils')

function createRenderQueue (renderQueue, { pages, store, schema }) {
  const queryFields = schema.getQueryType().getFields()
  const queue = renderQueue.slice()

  for (const page of pages.data()) {
    if (page.query.paginate) {
      const totalPages = calcTotalPages(page, store, queryFields)

      for (let i = 1; i <= totalPages; i++) {
        queue.push(createRenderEntry(page, i))
      }
    } else {
      queue.push(createRenderEntry(page))
    }
  }

  return queue
}

function calcTotalPages (page, store, queryFields) {
  const { belongsTo, fieldName, typeName, perPage, skip, limit } = page.query.paginate
  const { collection } = store.getContentType(typeName)

  let chain

  if (belongsTo) {
    const { id, path } = belongsTo
    const { args } = queryFields[fieldName].type.getFields().belongsTo
    const node = id ? collection.by('id', id) : collection.by('path', path)
    const key = createBelongsToKey(node)
    const query = { [key]: { $eq: true }}

    Object.assign(query, createCollectionQuery(args, page.query.filters))

    chain = store.chainIndex(query)
  } else {
    const { args } = queryFields[fieldName]
    const query = createCollectionQuery(args, page.query.filters)

    chain = collection.chain().find(query)
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

function createCollectionQuery (args, filters) {
  const filter = args.find(arg => arg.name === 'filter')
  const fields = filter.type.getFields()

  return createFilterQuery(filters, fields)
}

module.exports = createRenderQueue
