const path = require('path')
const Router = require('vue-router')
const { unslash } = require('../../utils')

module.exports = async ({ routes }, outDir, graphql) => {
  const router = new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: routes.map(page => ({
      path: page.route
    }))
  })

  const makePage = (data, page = 1) => {
    const fullPath = page > 1 ? `${data.path}/${page}` : data.path
    const route = router.resolve(fullPath).route
    const output = path.resolve(outDir, unslash(route.path))

    return {
      path: fullPath,
      query: data.query,
      output,
      route
    }
  }

  const makeTemplate = (node, data) => {
    const route = router.resolve(node.path).route
    const output = path.resolve(outDir, unslash(route.path))

    return {
      path: node.path,
      query: data.query,
      output,
      route
    }
  }

  const pages = []

  for (const page of routes) {
    switch (page.type) {
      case 'page':
        pages.push(makePage(page))

        if (page.paginate) {
          const { collection, perPage } = page.paginate

          // get page info for this connection to figure
          // out how many pages that shuld be rendered
          const { data, errors } = await graphql(`
            query PageInfo ($perPage: Int) {
              ${collection} (perPage: $perPage) {
                pageInfo {
                  totalPages
                }
              }
            }
          `, { perPage })

          if (errors && errors.length) {
            throw new Error(errors)
          }

          const { totalPages } = data[collection].pageInfo

          for (let i = 2; i <= totalPages; i++) {
            pages.push(makePage(page, i))
          }
        }

        break
      case 'template':
        const nodes = page.source.nodes.find()
        for (const node of nodes) {
          pages.push(makeTemplate(node, page))
        }
        break
    }
  }

  return {
    router,
    pages
  }
}
