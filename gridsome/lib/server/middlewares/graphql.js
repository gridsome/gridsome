const { print } = require('graphql')
const { createQueryVariables } = require('../../pages/utils')

module.exports = ({ store, pages, config }) => {
  return async function graphqlMiddleware (req, res, next) {
    const { body = {}} = req

    // allow OPTIONS method for cors
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    if (body.query) {
      return next()
    }

    const page = pages.findPage({ path: body.path })

    if (!page) {
      return res
        .status(404)
        .send({ code: 404, message: `Could not find ${body.path}` })
    }

    if (!page.query.document) {
      return res.json({ extensions: { context: page.context }, data: null })
    }

    req.body = {
      query: print(page.query.document),
      variables: createQueryVariables(page, body.page)
    }

    next()
  }
}
