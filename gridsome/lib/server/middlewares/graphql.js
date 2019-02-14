const { print } = require('graphql')
const { getGraphQLParams } = require('express-graphql')

const {
  contextValues,
  processPageQuery
} = require('../../graphql/page-query')

module.exports = ({ store }) => {
  return async function (req, res, next) {
    const { query, variables, ...body } = await getGraphQLParams(req)
    const pageQuery = processPageQuery({ query })

    if (variables.path) {
      const node = store.getNodeByPath(variables.path)
      const values = node ? contextValues(node, pageQuery.variables) : {}

      Object.assign(variables, values)
    }

    req.body = body
    req.body.query = print(pageQuery.query)
    req.body.variables = variables

    next()
  }
}
