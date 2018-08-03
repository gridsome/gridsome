const camelCase = require('camelcase')
const { findAll } = require('../utils')
const { parse } = require('../graphql/graphql')

/**
 * Creates route data for router and the build command
 */
module.exports = async service => {
  const allPages = await findAll(service.pages)
  const pages = allPages.filter(page => page.type === 'page')
  const notFoundPage = allPages.find(page => page.type === '404')

  const notFoundComponent = notFoundPage
    ? notFoundPage.component
    : '#app/pages/404.vue'

  const routes = pages.map(page => {
    return {
      type: page.type,
      path: page.path,
      name: camelCase(page.path.replace('/', ' ')) || 'home',
      component: page.component,
      query: page.graphql.query
        ? parse(page.graphql.query)
        : null
    }
  })

  // create an object with GraphQL type names and path to Vue component
  const templates = allPages.reduce((templates, page) => {
    if (page.type === 'template') {
      templates[page.graphql.type] = page
    }
    return templates
  }, {})

  for (const { source } of service.sources) {
    for (const typeName in source.types) {
      const contentType = source.types[typeName]
      const nodeType = contentType.type

      if (templates.hasOwnProperty(nodeType)) {
        const page = templates[nodeType]
        const query = page.graphql.query
          ? parse(page.graphql.query)
          : null

        routes.push({
          type: 'template',
          path: contentType.route,
          component: page.component,
          name: camelCase(nodeType),
          nodeType,
          source,
          query
        })
      }
    }
  }

  routes.sort((a, b) => a.path.split('/').length > b.path.split('/').length)

  return {
    notFoundComponent,
    routes
  }
}
