const path = require('path')
const { trim } = require('lodash')
const Router = require('vue-router')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../../utils')

module.exports = async ({ routerData, config, graphql }) => {
  const router = new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: routerData.pages.map(page => ({
      path: page.route || page.path
    }))
  })

  const createPage = (page, currentPage = 1) => {
    const fullPath = currentPage > 1 ? `${trim(page.path, '/')}/${currentPage}` : page.path
    const route = router.resolve(fullPath).route
    const output = path.resolve(config.outDir, trim(route.path, '/'))

    return {
      path: fullPath,
      query: page.pageQuery.query,
      output,
      route
    }
  }

  const createTemplate = (node, page) => {
    const route = router.resolve(node.path).route
    const output = path.resolve(config.outDir, trim(route.path, '/'))

    return {
      path: node.path,
      query: page.pageQuery.query,
      output,
      route
    }
  }

  const queue = []

  for (const page of routerData.pages) {
    switch (page.type) {
      case STATIC_ROUTE:
      case STATIC_TEMPLATE_ROUTE:
        queue.push(createPage(page))

        break

      case DYNAMIC_TEMPLATE_ROUTE:
        page.collection.find().forEach(node => {
          queue.push(createTemplate(node, page))
        })

        break

      case PAGED_ROUTE:
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

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createPage(page, i))
        }

        break
    }
  }

  return queue
}
