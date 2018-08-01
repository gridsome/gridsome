const camelCase = require('camelcase')

const getAll = store => new Promise((resolve, reject) => {
  store.find({}, (err, results) => err ? reject(err) : resolve(results))
})

module.exports = async service => {
  const allPages = await getAll(service.pages)
  const pages = allPages.filter(page => page.type === 'page')
  const notFoundPage = allPages.find(page => page.type === '404')

  const notFoundComponent = notFoundPage
    ? notFoundPage.component
    : '#app/pages/404.vue'

  const routes = pages.map(page => {
    return {
      path: page.path,
      component: page.component,
      name: camelCase(page.path.replace('/', ' ')) || 'home'
    }
  })

  // create an object with GraphQL type names and path to Vue component
  const templates = allPages.reduce((templates, page) => {
    if (page.type === 'template') {
      templates[page.graphql.type] = page.component
    }
    return templates
  }, {})

  // create routes for GraphQL types that has a template
  for (const { source } of service.sources) {
    for (const typeName in source.types) {
      const contentType = source.types[typeName]
      const nodeType = contentType.type

      if (templates.hasOwnProperty(nodeType)) {
        routes.push({
          path: contentType.route,
          component: templates[nodeType],
          name: camelCase(nodeType)
        })
      }
    }
  }

  // render pahts with most parts last
  routes.sort((a, b) => a.path.split('/').length > b.path.split('/').length)

  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${routes.map(route => `{
      path: ${JSON.stringify(route.path)},
      name: ${route.name ? JSON.stringify(route.name) : 'null'},
      meta: ${route.meta ? JSON.stringify(route.meta) : 'null'},
      component: () => import(/* webpackChunkName: ${JSON.stringify(route.name)} */ ${JSON.stringify(route.component)})
    }`).join(',')}]\n\n`

  res += `export { NotFound }\n\n`

  res += `export default router => {
    router.addRoutes([...routes, {
      path: '*',
      name: '404',
      component: NotFound
    }])
  }\n`

  return res
}
