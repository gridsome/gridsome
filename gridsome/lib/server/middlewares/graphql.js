const { print } = require('graphql')
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
      const context = findContext(path, { store, pages, pageQuery })

      if (!context) {
        return res
          .status(404)
          .send({
            code: 404,
            message: `Could not find ${path}`
          })
      }

      Object.assign(variables, context, { path })
    }

    req.body = body
    req.body.query = print(pageQuery.query)
    req.body.variables = variables

    next()
  }
}

function findContext (path, { store, pages, pageQuery }) {
  if (pages.hasPage(path)) {
    return pages.getPage(path).context
  } else if (store.index.findOne({ path })) {
    const node = store.getNodeByPath(path)
    return contextValues(node, pageQuery.variables)
  }
}
