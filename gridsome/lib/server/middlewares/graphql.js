const path = require('path')
const { trim, trimEnd } = require('lodash')
const { createQueryVariables } = require('../../graphql/utils')

module.exports = ({ pages, schema }) => {
  return async function graphqlMiddleware (req, res) {
    const { dir } = path.posix.parse(req.params[0])
    const paramPath = '/' + trim(dir, '/')
    const { routeId } = req.query

    const notFound = () => res
      .status(404)
      .send({ code: 404, message: `Could not find ${paramPath}` })

    let page, route
    let currentPage = null

    if (routeId) {
      route = pages.getRoute(routeId)

      if (!route) return notFound()

      page = route.pages().shift()
    } else {
      const { route: matchedRoute, params } = pages.getMatch(paramPath)

      if (!matchedRoute) return notFound()

      // page/1/index.html is not statically generated
      // in production and should return 404 in develop
      if (matchedRoute.internal.query.directives.paginate) {
        currentPage = parseInt(params.page, 10) || 0

        if (params.page && currentPage <= 1) {
          return notFound()
        }

        delete params.page
      }

      const pagePath = trimEnd(matchedRoute.createPath(params), '/') || '/'
      page = pages._pages.by('path', pagePath)
      route = matchedRoute
    }

    if (!page) return notFound()

    const result = pages._createPageData(route, page, {
      page: currentPage || undefined
    })

    if (route.internal.query.document) {
      const { data } = await schema.runQuery(
        route.internal.query.document,
        result.queryVariables
      )

      result.data = data
    }

    res.json(result)
  }
}
