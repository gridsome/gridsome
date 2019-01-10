const { getGraphQLParams } = require('express-graphql')
const { getRootNodeFields } = require('../../graphql/utils')

module.exports = ({ store }) => {
  return async function (req, res, next) {
    const { query, variables, ...body } = await getGraphQLParams(req)
    const node = store.getNodeByPath(variables.path)
    const fields = getRootNodeFields(node)

    req.body = body

    // workaround until query directives
    // works in mergeSchema from graphql-tools
    req.body.query = query.replace(/@paginate/g, '')
    req.body.variables = { ...fields, ...variables }

    next()
  }
}
