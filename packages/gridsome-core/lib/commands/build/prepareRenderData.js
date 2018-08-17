const path = require('path')
const Router = require('vue-router')
const { trim } = require('lodash')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../../utils/enums')

module.exports = async ({ pages }, outDir, graphql) => {
  const router = new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: pages.map(page => ({
      path: page.route || page.path
    }))
  })

  const makePage = (page, currentPage = 1) => {
    const fullPath = currentPage > 1 ? `${page.path}/${currentPage}` : page.path
    const route = router.resolve(fullPath).route
    const output = path.resolve(outDir, trim(route.path, '/'))

    return {
      path: fullPath,
      query: page.pageQuery.query,
      output,
      route
    }
  }

  const makeTemplate = (node, page) => {
    const route = router.resolve(node.path).route
    const output = path.resolve(outDir, trim(route.path, '/'))

    return {
      path: node.path,
      query: page.pageQuery.query,
      output,
      route
    }
  }

  const renderPages = []

  for (const page of pages) {
    switch (page.type) {
      case STATIC_ROUTE:
      case STATIC_TEMPLATE_ROUTE:
        renderPages.push(makePage(page))

        break

      case DYNAMIC_TEMPLATE_ROUTE:
        page.collection.find().forEach(node => {
          renderPages.push(makeTemplate(node, page))
        })

        break

      case PAGED_ROUTE:
        renderPages.push(makePage(page))

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
          renderPages.push(makePage(page, i))
        }

        break
    }
  }

  return renderPages
}
