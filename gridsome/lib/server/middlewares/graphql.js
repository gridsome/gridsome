const { getGraphQLParams } = require('express-graphql')

module.exports = () => {
  return async function (req, res, next) {
    req.body = await getGraphQLParams(req)

    // workaround until query directives
    // works in mergeSchema from graphql-tools
    req.body.query = req.body.query
      ? req.body.query.replace(/@paginate/g, '')
      : null

    next()
  }
}
