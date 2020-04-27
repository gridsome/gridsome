const { print } = require('graphql')
const { trimEnd } = require('lodash')
const { createQueryVariables } = require('../../graphql/utils')

module.exports = ({ pages }) => {
  return async function graphqlMiddleware (req, res, next) {
    const { body = {}} = req

    const notFound = () => res
      .status(404)
      .send({ code: 404, message: `Could not find ${body.path}` })

    // allow OPTIONS method for cors
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    if (body.query) {
      return next()
    }

    let route = null
    let currentPage = null
    let params = {}

    if (body.dynamic) {
      route = pages.getRouteByPath(body.path)
    } else {
      const match = pages.getMatch(body.path)

      route = match.route
      params = match.params
    }

    if (!route) return notFound()

    // page/1/index.html is not statically generated
    // in production and should return 404 in develop
    if (route.internal.query.directives.paginate) {
      currentPage = parseInt(params.page, 10) || 0

      if (params.page && currentPage <= 1) {
        return notFound()
      }

      delete params.page
    }

    const path = !body.dynamic
      ? trimEnd(route.createPath(params), '/') || '/'
      : body.path

    const page = pages._pages.by('path', path)

    if (!page) return notFound()

    if (!route.internal.query.document) {
      return res.json({
        extensions: {
          context: page.context
        },
        data: null
      })
    }

    req.body = {
      query: print(route.internal.query.document),
      variables: createQueryVariables(
        page.path,
        page.internal.query.variables,
        currentPage || undefined
      )
    }

    next()
  }
}
