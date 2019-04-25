const { print } = require('graphql')
const { trimEnd } = require('lodash')
const { getGraphQLParams } = require('express-graphql')

const {
  contextValues,
  processPageQuery
} = require('../../graphql/page-query')

module.exports = ({ store }) => {
  return async function (req, res, next) {
    // allow OPTIONS method for cors
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    const { query = '', variables, ...body } = await getGraphQLParams(req)

    const pageQuery = processPageQuery({ query })

    if (variables && variables.path) {
      const entry = store.index.findOne({
        path: { $in: [variables.path, trimEnd(variables.path, '/')] }
      })

      if (!entry) {
        return res
          .status(404)
          .send({
            code: 404,
            message: `Could not find ${variables.path}`
          })
      }

      const node = store.getNodeByPath(entry.path)
      const values = node ? contextValues(node, pageQuery.variables) : null

      Object.assign(variables, values, { path: entry.path })
    }

    req.body = body
    req.body.query = print(pageQuery.query)
    req.body.variables = variables

    next()
  }
}
