const camelCase = require('camelcase')

module.exports = service => {
  const allPages = service.pages.find()
  const pages = service.pages.find({ type: 'page' })
  const notFoundPage = service.pages.findOne({ type: '404' })

  const notFoundComponent = notFoundPage
    ? notFoundPage.component
    : '@gridsome/app/pages/404.vue'

  const routes = pages.map(page => {
    const name = camelCase(page.path.replace('/', ' ')) || 'home'
    const route = page.pageQuery.paginate.collection
      ? `${page.path}/:page(\\d+)?`
      : page.path

    return {
      name,
      route,
      type: page.type,
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

  for (const { source } of service.sources) {
    for (const typeName in source.types) {
      const contentType = source.types[typeName]
      const nodeType = contentType.type

      if (templates.hasOwnProperty(nodeType)) {
        const page = templates[nodeType]

        routes.push({
          type: 'template',
          path: contentType.route,
          route: contentType.route,
          component: page.component,
          name: camelCase(nodeType),
          pageQuery: page.pageQuery,
          nodeType,
          source
        })
      }
    }
  }

  routes.sort((a, b) => a.path.split('/').length > b.path.split('/').length)

  service.routerData = {
    notFoundComponent,
    routes
  }
}
