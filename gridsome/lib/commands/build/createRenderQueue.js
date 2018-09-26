const path = require('path')
const { trim } = require('lodash')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../../utils')

module.exports = async ({ router, config, graphql }) => {
  const createPage = (page, currentPage = 1) => {
    const isPager = currentPage > 1
    const fullPath = isPager ? `${trim(page.path, '/')}/${currentPage}` : page.path
    const { route } = router.resolve(fullPath)
    const { query } = page.pageQuery
    const routePath = trim(route.path, '/')
    const dataPath = !routePath ? 'index.json' : `${routePath}.json`
    const htmlOutput = path.resolve(config.outDir, routePath, 'index.html')
    const dataOutput = path.resolve(config.cacheDir, 'data', dataPath)

    // TODO: remove this before v1.0
    const output = path.dirname(htmlOutput)

    return {
      path: fullPath,
      dataOutput: query ? dataOutput : null,
      htmlOutput,
      output,
      query,
      route
    }
  }

  const createTemplate = (node, page) => {
    const { route } = router.resolve(node.path)
    const { query } = page.pageQuery
    const routePath = trim(route.path, '/')
    const htmlOutput = path.resolve(config.outDir, routePath, 'index.html')
    const dataOutput = path.resolve(config.cacheDir, 'data', `${routePath}.json`)

    // TODO: remove this before v1.0
    const output = path.dirname(htmlOutput)

    return {
      path: node.path,
      dataOutput: query ? dataOutput : null,
      htmlOutput,
      output,
      query,
      route
    }
  }

  const queue = []

  for (const route of router.options.routes) {
    const page = route.component()

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
