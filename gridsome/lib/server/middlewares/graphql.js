const { print } = require('graphql')
const { createQueryVariables } = require('../../graphql/utils')

module.exports = ({ pages }) => {
  return async function graphqlMiddleware (req, res, next) {
    const { body = {}} = req

    // allow OPTIONS method for cors
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    if (body.query || !body.path) {
      return next()
    }

    const page = pages._pages.findOne({ path: body.path })

    // page/1/index.html is not statically generated
    // in production and should return 404 in develop
    if (!page || body.page === 1) {
      return res
        .status(404)
        .send({ code: 404, message: `Could not find ${body.path}` })
    }

    const route = pages.getRoute(page.internal.route)

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
        body.page
      )
    }

    next()
  }
}
