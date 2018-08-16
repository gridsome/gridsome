const camelCase = require('camelcase')
const { orderBy } = require('lodash')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE,
  SOURCE_PLUGIN
} = require('../utils/enums')

module.exports = service => {
  const allPages = service.pages.find()
  const pages = service.pages.find({ type: 'page' })
  const notFoundPage = service.pages.findOne({ type: '404' })

  const notFoundComponent = notFoundPage
    ? notFoundPage.component
    : '@gridsome/app/pages/404.vue'

  const routes = pages.map(page => {
    const name = camelCase(page.path.replace(/\//g, ' ')) || 'home'
    let type = STATIC_ROUTE
    let route = page.path

    if (page.pageQuery.paginate.collection) {
      route = `${page.path}/:page(\\d+)?`
      type = PAGED_ROUTE
    }

    return {
      name,
      type,
      route,
      path: page.path,
      component: page.component,
      pageQuery: page.pageQuery
    }
  })

  // create an object with GraphQL type names and path to Vue component
  const templates = allPages.reduce((templates, page) => {
    if (page.type === 'template') {
      templates[page.pageQuery.type] = page
    }
    return templates
  }, {})

  const sourcePlugins = service.config.plugins.filter(p => p.type === SOURCE_PLUGIN)

  for (const { instance: source } of sourcePlugins) {
    for (const typeName in source.types) {
      const contentType = source.types[typeName]
      const nodeType = contentType.type

      if (templates.hasOwnProperty(nodeType)) {
        const { component, pageQuery } = templates[nodeType]

        // Add a dynamic route for this template if a route is
        // specified. Or we'll create a route for each node. The only
        // difference here is that dynamic routes has route and name
        // while static routes has path and chunkName.

        if (contentType.route) {
          routes.push({
            type: DYNAMIC_TEMPLATE_ROUTE,
            route: contentType.route,
            name: camelCase(nodeType),
            component,
            pageQuery,
            nodeType,
            source
          })
        } else {
          const nodes = source.nodes.find({ type: nodeType })

          for (const node of nodes) {
            routes.push({
              type: STATIC_TEMPLATE_ROUTE,
              path: node.path,
              chunkName: camelCase(nodeType),
              component,
              pageQuery,
              nodeType,
              source
            })
          }
        }
      }
    }
  }

  service.routerData = {
    notFoundComponent,
    routes: orderBy(routes, [
      route => route.name === 'home',
      route => route.type === STATIC_ROUTE,
      route => route.type === PAGED_ROUTE,
      route => route.type === STATIC_TEMPLATE_ROUTE,
      route => route.type === DYNAMIC_TEMPLATE_ROUTE
    ], ['desc', 'desc', 'desc', 'desc', 'desc'])
  }
}
