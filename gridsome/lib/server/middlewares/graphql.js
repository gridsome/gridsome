const { print } = require('graphql')
const { getGraphQLParams } = require('express-graphql')
const queryVariables = require('../../graphql/utils/queryVariables')
const parsePageQuery = require('../../graphql/utils/parsePageQuery')

module.exports = ({ store }) => {
  return async function (req, res, next) {
    const { query, variables, ...body } = await getGraphQLParams(req)
    const result = parsePageQuery({ content: query })

    if (variables.path) {
      const node = store.getNodeByPath(variables.path)
      const values = queryVariables(node, result.variables)

      Object.assign(variables, values)
    }

    req.body = body
    req.body.query = print(result.query)
    req.body.variables = variables

    next()
  }
}
