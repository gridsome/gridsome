const LRU = require('lru-cache')
const { execute } = require('graphql')
const createRenderFn = require('../createRenderFn')

const {
  contextValues,
  processPageQuery
} = require('../../graphql/page-query')

module.exports = (app, routes) => {
  const render = createRenderFn({
    htmlTemplate: app.config.htmlTemplate,
    clientManifestPath: app.config.clientManifestPath,
    serverBundlePath: app.config.serverBundlePath
  })

  const cache = new LRU({
    maxAge: app.config.maxCacheAge,
    max: 100
  })

  return async ({ url }, res, next) => {
    const cached = cache.get(url)

    if (cached) {
      return res.end(cached)
    }

    const results = await handleUrl(url, app, routes)

    if (results.errors) {
      next(results.errors[0])
      return
    }

    try {
      const html = await render(url, results.data)
      cache.set(url, html)
      res.end(html)
    } catch (err) {
      next(err)
    }
  }
}

async function handleUrl (url, app, routes, fallback = null) {
  const route = routes.find(({ regex }) => regex.test(url))
  const { page, ...params } = route.toParams(url)
  const context = app.createSchemaContext()
  const path = route.toPath(params)
  let data = {}

  if (route.pageQuery) {
    const node = app.store.getNodeByPath(path)
    const pageQuery = processPageQuery(route.pageQuery)
    const variables = { path }

    if (page) {
      variables.page = Number(page)
    }

    if (node) {
      Object.assign(variables, contextValues(node, pageQuery.variables))
    }

    data = pageQuery.query
      ? await execute(app.schema, pageQuery.query, undefined, context, variables)
      : {}
  }

  return data
}
