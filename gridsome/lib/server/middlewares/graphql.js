const { print } = require('graphql')
const { trimEnd } = require('lodash')
const { contextValues } = require('../../graphql/page-query')

module.exports = ({ store, pages }) => {
  return async function graphqlMiddleware (req, res, next) {
    const { body = {}} = req

    if (!body.path) return next()

    const page = pages.findPage({
      path: { $in: [body.path, trimEnd(body.path, '/')] }
    })

    if (!page) {
      return res
        .status(404)
        .send({ code: 404, message: `Could not find ${body.path}` })
    }

    const { context, queryContext, query: { query, variables }} = page

    if (!query) {
      return res.json({ extensions: { context }, data: null })
    }

    req.body = {
      query: print(query),
      variables: {
        ...contextValues(queryContext || context, variables),
        page: body.page,
        path: page.path
      }
    }

    next()
  }
}
