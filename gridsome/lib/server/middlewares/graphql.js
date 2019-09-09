const { print } = require('graphql')
const { trimEnd } = require('lodash')
const { createQueryVariables } = require('../../graphql/utils')

module.exports = ({ pages }) => {
  return async function graphqlMiddleware (req, res, next) {
    const { body = {}} = req

    // allow OPTIONS method for cors
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    if (body.query) {
      return next()
    }

    const { route, params } = pages.getMatch(body.path)
    let currentPage = undefined

    if (!route) {
      return res
        .status(404)
        .send({ code: 404, message: `Could not find ${body.path}` })
    }

    // page/1/index.html is not statically generated
    // in production and should return 404 in develop
    if (route.internal.query.paginate) {
      currentPage = parseInt(params.page, 10) || 0

      if (params.page && currentPage <= 1) {
        return res
          .status(404)
          .send({ code: 404, message: `Could not find ${body.path}` })
      }

      delete params.page
    }

    const path = route.createPath(params)
    const page = pages._pages.by('path', trimEnd(path, '/') || '/')

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
