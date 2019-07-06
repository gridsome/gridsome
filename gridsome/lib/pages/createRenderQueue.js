const path = require('path')
const { pathToFilePath } = require('./utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
const { createBelongsToKey, createPagedNodeEdges } = require('../graphql/nodes/utils')

function createRenderQueue ({ renderQueue }) {
  const options = { name: 'GridsomePages', before: 'GridsomeSchema' }

  renderQueue.tap(options, (renderQueue, { pages, store, schema, config }) => {
    const queryFields = schema.getQueryType().getFields()
    const queue = renderQueue.slice()
    const { outDir } = config

    for (const route of pages.routes()) {
      for (const page of route.pages()) {
        if (page.internal.query.paginate) {
          const totalPages = calcTotalPages(
            page.internal.query,
            store,
            queryFields
          )

          for (let i = 1; i <= totalPages; i++) {
            queue.push(createRenderEntry(page, i, outDir))
          }
        } else {
          queue.push(createRenderEntry(page, 0, outDir))
        }
      }
    }

    return queue
  })
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

function createRenderEntry (page, currentPage, outDir) {
  const segments = page.path.split('/').filter(Boolean)

  if (currentPage > 1) {
    segments.push(currentPage)
  }

  const normalizedPath = `/${segments.join('/')}`

  return {
    path: normalizedPath,
    dataOutput: null,
    htmlOutput: path.join(outDir, pathToFilePath(normalizedPath)),
    internal: {
      pageId: page.id,
      routeId: page.internal.route,
      currentPage
    }
  }
}

function createCollectionQuery (args, filters) {
  const filter = args.find(arg => arg.name === 'filter')
  const fields = filter.type.getFields()

  return createFilterQuery(filters, fields)
}

module.exports = createRenderQueue
