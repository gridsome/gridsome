const LRU = require('lru-cache')
const createRenderFn = require('../createRenderFn')

module.exports = app => {
  const { config } = app

  const render = createRenderFn({
    htmlTemplate: config.htmlTemplate,
    clientManifestPath: config.clientManifestPath,
    serverBundlePath: config.serverBundlePath
  })

  const cache = LRU({
    maxAge: config.maxCacheAge,
    max: 100
  })

  return async (req, res, next) => {
    const { route } = app.router.resolve(req.url)
    const cached = cache.get(route.fullPath)

    if (cached) {
      return res.end(cached)
    }

    const { data } = await app.queryRouteData(route)

    try {
      const html = await render(route.path, data)
      cache.set(route.fullPath, html)
      res.end(html)
    } catch (err) {
      next(err)
    }
  }
}
