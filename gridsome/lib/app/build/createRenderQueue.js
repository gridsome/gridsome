const path = require('path')
const { pathToFilePath } = require('../../pages/utils')
const { createQueryVariables } = require('../../graphql/utils')

const {
  toFilterArgs,
  createBelongsToKey,
  createPagedNodeEdges
} = require('../../graphql')

function createRenderQueue ({ hooks, pages, store, schema, config }) {
  const { outDir } = config
  const queue = []

  for (const route of pages.routes()) {
    for (const page of route.pages()) {
      const { query } = page.internal

      if (route.type === 'static' && query.paginate) {
        const totalPages = calcTotalPages(page.internal.query.paginate, store, schema)

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createRenderEntry(page, i, route, outDir))
        }
      } else {
        queue.push(createRenderEntry(page, 0, route, outDir))
      }
    }
  }

  return hooks.renderQueue.call(queue)
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
    const context = schema.createContext()
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

function createRenderEntry (page, currentPage, route, outDir) {
  const segments = page.path.split('/').filter(Boolean)

  if (currentPage > 1) {
    segments.push(currentPage)
  }

  const normalizedPath = `/${segments.join('/')}`
  const htmlOutput = path.join(outDir, pathToFilePath(normalizedPath))

  const location = route.type === 'dynamic'
    ? { name: route.name }
    : { path: normalizedPath }

  const queryVariables = route.internal.query.document
    ? createQueryVariables(
      normalizedPath,
      page.internal.query.variables,
      currentPage
    )
    : {}

  return {
    location,
    htmlOutput,
    queryVariables,
    type: route.type,
    path: normalizedPath,
    routeId: page.internal.route,
    pageId: page.id
  }
}

module.exports = createRenderQueue
