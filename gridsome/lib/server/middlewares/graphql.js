const { getGraphQLParams } = require('express-graphql')

module.exports = ({ store }) => {
  return async function (req, res, next) {
    const { query, variables, ...body } = await getGraphQLParams(req)
    const node = store.getNodeByPath(variables.path)

    req.body = body

    // workaround until query directives
    // works in mergeSchema from graphql-tools
    req.body.query = query.replace(/@paginate/g, '')
    req.body.variables = { ...node.fields, ...variables }

    next()
  }
}
