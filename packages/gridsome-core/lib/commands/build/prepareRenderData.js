const path = require('path')
const Router = require('vue-router')
const { trim } = require('lodash')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../../utils/enums')

module.exports = async ({ routes }, outDir, graphql) => {
  const router = new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: routes.map(page => ({
      path: page.route || page.path
    }))
  })

  const makePage = (data, page = 1) => {
    const fullPath = page > 1 ? `${data.path}/${page}` : data.path
    const route = router.resolve(fullPath).route
    const output = path.resolve(outDir, trim(route.path, '/'))

    return {
      path: fullPath,
      query: data.pageQuery.query,
      output,
      route
    }
  }

  const makeTemplate = (node, data) => {
    const route = router.resolve(node.path).route
    const output = path.resolve(outDir, trim(route.path, '/'))

    return {
      path: node.path,
      query: data.pageQuery.query,
      output,
      route
    }
  }

  const pages = []

  for (const page of routes) {
    switch (page.type) {
      case STATIC_ROUTE:
      case STATIC_TEMPLATE_ROUTE:
        pages.push(makePage(page))

        break

      case DYNAMIC_TEMPLATE_ROUTE:
        page.source.nodes
          .find({ type: page.nodeType })
          .forEach(node => {
            pages.push(makeTemplate(node, page))
          })

        break

      case PAGED_ROUTE:
        pages.push(makePage(page))

        const { collection, perPage } = page.pageQuery.paginate
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

        break
    }
  }

  return {
    router,
    pages
  }
}
