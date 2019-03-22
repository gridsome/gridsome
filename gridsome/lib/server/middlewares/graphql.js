const { print } = require('graphql')
const { trimEnd } = require('lodash')
const { getGraphQLParams } = require('express-graphql')

const {
  contextValues,
  processPageQuery
} = require('../../graphql/page-query')

module.exports = ({ store, pages }) => {
  return async function (req, res, next) {
    const { query, variables, ...body } = await getGraphQLParams(req)

    if (!query || !variables) {
      return next()
    }

    const pageQuery = processPageQuery({ query })
    const { path } = variables

    if (path) {
      const page = pages.findPage({
        path: { $in: [path, trimEnd(path, '/')] }
      })

      if (!page) {
        return res
          .status(404)
          .send({ code: 404, message: `Could not find ${path}` })
      }

      Object.assign(
        variables,
        contextValues(page.context, pageQuery.variables),
        { path: page.path }
      )
    }

    req.body = body
    req.body.query = print(pageQuery.query)
    req.body.variables = variables

    next()
  }
}
