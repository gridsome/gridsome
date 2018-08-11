const camelCase = require('camelcase')
const { parse } = require('../graphql/graphql')
const { findAll } = require('../utils')
const { pagingFromAst } = require('../graphql/schema/directives/paginate')

/**
 * Creates route data for router and the build command
 */
module.exports = service => {
  const allPages = service.pages.find()
  const pages = allPages.filter(page => page.type === 'page')
  const notFoundPage = allPages.find(page => page.type === '404')

  const notFoundComponent = notFoundPage
    ? notFoundPage.component
    : '#app/pages/404.vue'

  const routes = await Promise.all(pages.map(async page => {
    const query = await parseQuery(page.graphql, service)
    const name = camelCase(page.path.replace('/', ' ')) || 'home'

    // add page suffix if this page wants pagination
    const route = query.paginate
      ? `${page.path}/:page(\\d+)?`
      : page.path

    return {
      name,
      type: page.type,
      path: page.path,
      component: page.component,
      route,
      ...query
    }
  }))

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
        const query = await parseQuery(page.graphql, service)

        routes.push({
          type: 'template',
          path: contentType.route,
          route: contentType.route,
          component: page.component,
          name: camelCase(nodeType),
          nodeType,
          source,
          ...query
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

async function parseQuery (options, service) {
  if (!options.query) return {}

  const ast = parse(options.query)
  const paginate = pagingFromAst(ast)

  return {
    query: ast,
    paginate
  }
}
