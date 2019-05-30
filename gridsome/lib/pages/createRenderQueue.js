const { createQueryVariables } = require('./utils')
const { toFilterArgs } = require('../graphql/filters/query')
const { createBelongsToKey } = require('../graphql/nodes/belongsTo')
const { createPagedNodeEdges } = require('../graphql/nodes/utils')

function createRenderQueue (renderQueue, { pages, store, schema }) {
  const queue = renderQueue.slice()

  for (const page of pages.data()) {
    if (page.query.paginate) {
      const totalPages = calcTotalPages(page.query.paginate, store, schema)

      for (let i = 1; i <= totalPages; i++) {
        queue.push(createRenderEntry(page, i))
      }
    } else {
      queue.push(createRenderEntry(page))
    }
  }

  return queue
}

function calcTotalPages (paginate, store, schema) {
  const { belongsToArgs, fieldName, typeName, args } = paginate
  const gqlField = schema.getComposer().Query.getField(fieldName)
  const typeComposer = schema.getComposer().get(typeName)
  const { collection } = store.getContentType(typeName)

  const filterQuery = toFilterArgs(args.filter, belongsToArgs
    ? gqlField.type.getFields().belongsTo.args.filter.type
    : gqlField.args.filter.type
  )

  let chain

  if (belongsToArgs) {
    const context = schema.createSchemaContext()
    const resolver = typeComposer.getResolver('findOne')
    const node = resolver.resolve({ args: belongsToArgs, context })
    filterQuery[createBelongsToKey(node)] = { $eq: true }
    chain = store.chainIndex(filterQuery)
  } else {
    chain = collection.chain().find(filterQuery)
  }

  const page = args.page || 1
  const res = createPagedNodeEdges(chain, { ...args, page })

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
