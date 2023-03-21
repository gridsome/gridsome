const LRU = require('lru-cache')
const createRenderFn = require('../createRenderFn')
const { createQueryVariables } = require('../../graphql/utils')

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
      console.log('return cached', url)
      return res.end(cached)
    }

    const route = routes.find(({ regex }) => regex.test(url))

    if (!route) return next()

    const { page: currentPage, ...params } = route.toParams(url)
    const page = app.pages.findPage({ path: route.toPath(params) })

    if (!page) {
      return res
        .status(404)
        .send({ code: 404, message: `Could not find ${url}` })
    }

    const state = { context: page.context, data: null }

    if (page.query.document) {
      const variables = createQueryVariables(page, currentPage)
      const results = await app.graphql(page.query.document, variables)

      if (results.errors) {
        next(results.errors[0])
        return
      }

      state.data = results.data
    }

    try {
      const html = await render(page.path, state)
      cache.set(url, html)
      res.end(html)
    } catch (err) {
      next(err)
    }
  }
}
