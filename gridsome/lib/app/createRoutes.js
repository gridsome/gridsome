const path = require('path')
const hashSum = require('hash-sum')
const camelCase = require('camelcase')
const { info } = require('../utils/log')
const { parsePageQuery, processPageQuery } = require('../graphql/page-query')

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  PAGED_TEMPLATE,
  NOT_FOUND_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../utils/constants')

const PAGE_PARAM = ':page(\\d+)?'

class Routes {
  constructor ({ outDir, dataDir, assetsDir }) {
    this.outDir = outDir
    this.dataDir = dataDir
    this.assetsDir = assetsDir
    this.routes = []
  }

  addRoute (options) {
    const route = new Route(options, this)
    this.routes.push(route)
    return route
  }

  get sortedRoutes () {
    return this.routes.slice().sort((a, b) => a.type - b.type)
  }

  get renderQueue () {
    const res = []

    for (const route of this.sortedRoutes) {
      route.renderQueue.forEach(entry => {
        res.push(entry)
      })
    }

    return res
  }
}

const pageQueryCache = {}

class Route {
  constructor (options, routes) {
    this.type = options.type
    this.name = options.name
    this.path = options.path
    this.route = options.route
    this.isIndex = options.isIndex
    this.pageQuery = options.pageQuery
    this.component = options.component
    this.chunkName = options.chunkName
    this.typeName = options.typeName
    this.routes = routes

    this.renderQueue = []
  }

  get metaDataPath () {
    const name = this.chunkName || this.name
    return path.join(this.routes.dataDir, 'routes-meta', `${name}.json`)
  }

  addRenderPath (path, variables = {}) {
    const renderItem = new RenderItem(path, {
      variables: { page: 1, ...variables, path }
    }, this)

    this.renderQueue.push(renderItem)

    return renderItem
  }

  processPageQuery () {
    if (!pageQueryCache[this.component]) {
      pageQueryCache[this.component] = processPageQuery(this.pageQuery)
    }

    return pageQueryCache[this.component]
  }
}

class RenderItem {
  constructor (path, options, route) {
    this.variables = options.variables || {}
    this.segments = path.split('/').filter(v => !!v)
    this.urlSegments = this.segments.map(s => decodeURIComponent(s))
    this.route = route

    if (this.variables.page > 1) {
      this.segments.push(this.variables.page)
    }

    this.hashSum = null
    this.data = null
    this.group = null
  }

  get path () {
    return `/${this.segments.join('/')}`
  }

  get pageQuery () {
    return this.route.processPageQuery()
  }

  get hasPageQuery () {
    return this.pageQuery.query !== null
  }

  get htmlOutput () {
    const segments = this.urlSegments.slice()
    const fileName = this.route.isIndex ? 'index.html' : `${segments.pop()}.html`
    return path.join(this.route.routes.outDir, ...segments, fileName)
  }

  get dataOutput () {
    return this.data
      ? path.join(this.route.routes.assetsDir, 'data', `${this.group}/${this.hashSum}.json`)
      : null
  }

  get metaData () {
    return this.data ? [this.group, this.hashSum] : null
  }

  setData (data, group = 1) {
    this.data = data
    this.group = group
    this.hashSum = hashSum(data)

    return this.dataOutput
  }
}

module.exports = ({ store, config }) => {
  const routes = new Routes(config)

  store.pages.find({ type: 'page' }).forEach(page => {
    const name = camelCase(page.path.replace(/\//g, ' ')) || 'home'
    let type = STATIC_ROUTE
    let route = page.path

    if (page.pageQuery.paginate) {
      route = `${page.path === '/' ? '' : page.path}/${PAGE_PARAM}`
      type = PAGED_ROUTE
    }

    routes.addRoute({
      name,
      type,
      route,
      isIndex: true,
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
    const makePath = path => isPaged ? `${path}/${PAGE_PARAM}` : path
    const { options, collection } = contentType
    const { component, pageQuery } = page

    // Add a dynamic route for this template if a route is
    // specified. Or else create a route for each node. The only
    // difference here is that dynamic routes has route and name
    // while static routes has path and chunkName.

    if (options.route) {
      routes.addRoute({
        type: isPaged ? PAGED_TEMPLATE : DYNAMIC_TEMPLATE_ROUTE,
        route: makePath(options.route),
        name: camelCase(typeName),
        isIndex: true,
        component,
        pageQuery,
        typeName
      })
    } else {
      const nodes = collection.find()
      const length = nodes.length

      for (let i = 0; i < length; i++) {
        routes.addRoute({
          type: isPaged ? PAGED_TEMPLATE : STATIC_TEMPLATE_ROUTE,
          path: makePath(nodes[i].path),
          chunkName: camelCase(typeName),
          isIndex: true,
          component,
          pageQuery,
          typeName
        })
      }
    }
  })

  routes.addRoute(createNotFoundRoute(store, config))

  return routes
}

function createNotFoundRoute (store, config) {
  const notFoundPage = store.pages.findOne({ type: '404' })
  const notFoundRoute = {
    component: path.join(config.appPath, 'pages', '404.vue'),
    pageQuery: parsePageQuery(),
    type: NOT_FOUND_ROUTE,
    isIndex: false,
    path: '/404',
    name: '404'
  }

  if (notFoundPage) {
    notFoundRoute.component = notFoundPage.component
    notFoundRoute.pageQuery = notFoundPage.pageQuery
  }

  return notFoundRoute
}
