const path = require('path')
const { pathToFilePath } = require('../../pages/utils')
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
  const { collection } = store.getCollection(typeName)

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
  const { outputDir, dataDir, pathPrefix } = config
  const hasTrailingSlash = /\/$/.test(page.publicPath)

  let publicPath = page.publicPath

  if (currentPage > 1) {
    const prefix = hasTrailingSlash ? '' : '/'
    const suffix = hasTrailingSlash ? '/' : ''
    publicPath += `${prefix}${currentPage}${suffix}`
  }

  const htmlOutput = pathToFilePath(publicPath)
  const dataOutput = pathToFilePath(publicPath, 'json')
  const prettyPath = trimEnd(publicPath, '/') || '/'

  const location = route.type === 'dynamic'
    ? { name: route.name }
    : { path: publicPath }

  return {
    location,
    path: prettyPath,
    htmlOutput: path.join(outputDir, htmlOutput),
    dataOutput: path.join(dataDir, dataOutput),
    publicPath: pathPrefix + publicPath,
    currentPath: publicPath,
    currentPage,
    type: route.type,
    routeId: page.internal.route,
    pageId: page.id
  }
}

module.exports = createRenderQueue
