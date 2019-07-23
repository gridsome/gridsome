const path = require('path')
const { pathToFilePath } = require('./utils')
const { createQueryVariables } = require('../graphql/utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
const { createBelongsToKey, createPagedNodeEdges } = require('../graphql/nodes/utils')

function createRenderQueue ({ hooks, pages, store, schema, config }) {
  const queryFields = schema.getQueryType().getFields()
  const queue = []

  for (const route of pages.routes()) {
    for (const page of route.pages()) {
      const { query } = page.internal

      if (route.type === 'static' && query.paginate) {
        const totalPages = calcTotalPages(query, store, queryFields)

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createRenderEntry(page, route, config, i))
        }
      } else {
        queue.push(createRenderEntry(page, route, config))
      }
    }
  }

  return hooks.renderQueue.call(queue)
}

function calcTotalPages (query, store, queryFields) {
  const { belongsTo, fieldName, typeName, perPage, skip, limit } = query.paginate
  const { collection } = store.getContentType(typeName)

  let chain

  if (belongsTo) {
    const { id, path } = belongsTo
    const { args } = queryFields[fieldName].type.getFields().belongsTo
    const node = id ? collection.by('id', id) : collection.by('path', path)
    const key = createBelongsToKey(node)
    const searchQuery = { [key]: { $eq: true }}

    Object.assign(searchQuery, createCollectionQuery(args, query.filters))

    chain = store.chainIndex(searchQuery)
  } else {
    const { args } = queryFields[fieldName]
    const searchQuery = createCollectionQuery(args, query.filters)

    chain = collection.chain().find(searchQuery)
  }

  const args = { page: 1, perPage, skip, limit }
  const res = createPagedNodeEdges(chain, args)

  return res.pageInfo.totalPages
}

function createRenderEntry (page, route, config, currentPage = 1) {
  const { outDir, publicPath, permalinks: { trailingSlash }} = config
  const segments = page.path.split('/').filter(Boolean)

  if (currentPage > 1) {
    segments.push(currentPage)
  }

  let currentPath = `/${segments.join('/')}`
  const htmlOutput = path.join(outDir, pathToFilePath(currentPath))
  const prettyPath = currentPath

  const location = route.type === 'dynamic'
    ? { name: route.name }
    : { path: currentPath }

  const queryVariables = route.internal.query.document
    ? createQueryVariables(
        currentPath,
        page.internal.query.variables,
        currentPage
      )
    : {}

  if (route.type === 'static' && currentPath !== '/' && trailingSlash) {
    currentPath += '/'
  }

  return {
    location,
    htmlOutput,
    prettyPath,
    queryVariables,
    type: route.type,
    path: currentPath,
    publicPath: publicPath + currentPath,
    routeId: page.internal.route,
    pageId: page.id
  }
}

function createCollectionQuery (args, filters) {
  const filter = args.find(arg => arg.name === 'filter')
  const fields = filter.type.getFields()

  return createFilterQuery(filters, fields)
}

module.exports = createRenderQueue
