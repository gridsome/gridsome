const path = require('path')
const camelCase = require('camelcase')
const { info } = require('../utils/log')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  PAGED_TEMPLATE,
  NOT_FOUND_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../utils/constants')

module.exports = ({ store, config }) => {
  const staticPages = []
  const pagedPages = []
  const pagedTemplates = []
  const staticTemplates = []
  const dynamicTemplates = []
  const specialPages = []

  store.pages.find({ type: 'page' }).forEach(page => {
    const name = camelCase(page.path.replace(/\//g, ' ')) || 'home'
    let arr = staticPages
    let type = STATIC_ROUTE
    let route = page.path

    if (page.pageQuery.paginate) {
      route = `${page.path === '/' ? '' : page.path}/:page(\\d+)?`
      type = PAGED_ROUTE
      arr = pagedPages
    }

    arr.push({
      name,
      type,
      route,
      path: page.path,
      component: page.component,
      pageQuery: page.pageQuery
    })
  })

  // TODO: go through collections in store instead and have a template
  // property for each of them that defaults to /templates/{typeName}.vue
  store.pages.find({ type: 'template' }).forEach(page => {
    const { typeName } = page
    const contentType = store.getContentType(typeName)

    if (!contentType) {
      return info(
        `No content type was found for ${page.internal.origin}`
      )
    }

    const isPaged = page.pageQuery.paginate
    const makePath = path => isPaged ? `${path}/:page(\\d+)?` : path
    const { options, collection } = contentType
    const { component, pageQuery } = page

    // Add a dynamic route for this template if a route is
    // specified. Or else create a route for each node. The only
    // difference here is that dynamic routes has route and name
    // while static routes has path and chunkName.

    if (options.route) {
      dynamicTemplates.push({
        type: isPaged ? PAGED_TEMPLATE : DYNAMIC_TEMPLATE_ROUTE,
        route: makePath(options.route),
        name: camelCase(typeName),
        component,
        pageQuery,
        typeName
      })
    } else {
      const nodes = collection.find()

      for (const node of nodes) {
        staticTemplates.push({
          type: isPaged ? PAGED_TEMPLATE : STATIC_TEMPLATE_ROUTE,
          path: makePath(node.path),
          chunkName: camelCase(typeName),
          component,
          pageQuery,
          typeName
        })
      }
    }
  })

  const notFoundPage = store.pages.findOne({ type: '404' })
  const notFoundRoute = {
    component: path.join(config.appPath, 'pages', '404.vue'),
    type: NOT_FOUND_ROUTE,
    directoryIndex: false,
    pageQuery: {},
    path: '/404',
    name: '404'
  }

  if (notFoundPage) {
    notFoundRoute.component = notFoundPage.component
    notFoundRoute.pageQuery = notFoundPage.pageQuery
  }

  staticPages.push(notFoundRoute)

  return [
    ...staticPages,
    ...pagedPages,
    ...pagedTemplates,
    ...staticTemplates,
    ...dynamicTemplates,
    ...specialPages
  ]
}
