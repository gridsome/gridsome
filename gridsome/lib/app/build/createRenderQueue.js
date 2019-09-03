const path = require('path')
const { pathToFilePath } = require('../../pages/utils')
const { createQueryVariables } = require('../../graphql/utils')
const { trimEnd } = require('lodash')

const {
  toFilterArgs,
  createBelongsToKey,
  createPagedNodeEdges
} = require('../../graphql')

function createRenderQueue ({ hooks, pages, store, schema, config }) {
  const queue = []

  for (const route of pages.routes()) {
    for (const page of route.pages()) {
      const { query } = page.internal

      if (route.type === 'static' && query.paginate) {
        const totalPages = calcTotalPages(page.internal.query.paginate, store, schema)

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

function createRenderEntry (page, route, config, currentPage = 1) {
  const { outDir, dataDir, publicPath } = config
  const hasTrailingSlash = /\/$/.test(page.path)

  let currentPath = page.path
  let queryVariables = {}

  if (currentPage > 1) {
    const prefix = hasTrailingSlash ? '' : '/'
    const suffix = hasTrailingSlash ? '/' : ''
    currentPath += `${prefix}${currentPage}${suffix}`
  }

  const htmlOutput = pathToFilePath(currentPath)
  const dataOutput = pathToFilePath(currentPath, 'json')
  const prettyPath = trimEnd(currentPath, '/') || '/'

  const location = route.type === 'dynamic'
    ? { name: route.name }
    : { path: currentPath }

  if (route.internal.query.document) {
    queryVariables = createQueryVariables(
      currentPath,
      page.internal.query.variables,
      currentPage
    )
  }

  return {
    location,
    htmlOutput: path.join(outDir, htmlOutput),
    dataOutput: path.join(dataDir, dataOutput),
    path: currentPath,
    prettyPath,
    queryVariables,
    type: route.type,
    publicPath: publicPath + currentPath,
    routeId: page.internal.route,
    pageId: page.id
  }
}

module.exports = createRenderQueue
