const path = require('path')
const hashSum = require('hash-sum')
const camelCase = require('camelcase')
const EventEmitter = require('events')
const { Collection } = require('lokijs')
const { createBelongsToKey } = require('../graphql/nodes/utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
const { parsePageQuery, processPageQuery, contextValues } = require('../graphql/page-query')

const nonIndex = ['/404']

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  PAGED_TEMPLATE,
  PAGED_STATIC_TEMPLATE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('../utils/constants')

class Pages extends EventEmitter {
  constructor (app) {
    super()

    this._app = app
    this._outDir = app.config.outDir
    this._dataDir = app.config.dataDir
    this._assetsDir = app.config.assetsDir
    this._appPath = app.config.appPath
    this._parsers = app.config.componentParsers
    this._templates = []
    this._pages = []

    this._collection = new Collection({
      indices: ['path', 'type'],
      unique: ['path'],
      autoupdate: true
    })
  }

  getPage (path) {
    return this._pages.find(page => page.path === path)
  }

  hasPage (path) {
    return this._pages.some(page => page.path === path)
  }

  removePage (path) {
    const page = this.getPage(path)
    this._pages = this._pages.filter(p => p !== page)

    this.emit('removePage', page)
  }

  addPage ({ path, component, context, name }) {
    const parsed = this._parseComponent(component)
    const pageQuery = parsePageQuery(parsed.pageQuery)
    const page = new Page({ path, component, context, name, pageQuery }, this)

    this._pages.push(page)
    this.emit('addPage', page)

    return page
  }

  updatePage ({ path, component, context, name }) {
    const page = this.getPage(path)
    this.emit('updatePage', page)
  }

  _addTemplate ({ name, typeName, route, component }) {
    const parsed = this._parseComponent(component)
    const pageQuery = parsePageQuery(parsed.pageQuery)
    const collection = this._app.store.getContentType(typeName)
    const template = new Template({ name, typeName, route, component, collection, pageQuery }, this)

    this._templates.push(template)

    return template
  }

  get routes () {
    const routes = []

    this._pages.forEach(page => routes.push(page.route))
    this._templates.forEach(template => routes.push(...template.routes))

    return routes.sort((a, b) => a.type - b.type)
  }

  genRenderQueue () {
    const queue = []

    for (const route of this.routes) {
      route.initRenderQueue(this._app)
      queue.push(...route.renderQueue)
    }

    return queue
  }

  _parseComponent (file) {
    const parser = this._parsers.find(options => file.match(options.test))
    return parser ? parser.parse(file) : {}
  }
}

class Page {
  constructor ({ path, component, pageQuery, name, context }, pages) {
    this.path = path
    this.component = component
    this.pageQuery = pageQuery
    this.context = context || {}
    this.name = name
    this.pages = pages
    this.route = this.genRoute()
  }

  genRoute () {
    const { name: fileName } = path.parse(this.component)
    const pageQuery = processPageQuery(this.pageQuery)
    const paginate = !!pageQuery.paginate.typeName

    const name = this.name
      ? camelCase(this.name)
      : this.path
        ? camelCase(fileName)
        : null

    return new Route({
      type: paginate ? PAGED_ROUTE : STATIC_ROUTE,
      path: genRoute(this.path, paginate),
      originalPath: this.path,
      component: this.component,
      pageQuery,
      name
    }, this)
  }
}

class Template {
  constructor ({ typeName, route, component, pageQuery, name, collection }, pages) {
    this.typeName = typeName
    this.route = route
    this.component = component
    this.pageQuery = pageQuery
    this.name = name
    this.collection = collection
    this.pages = pages
    this.routes = this.genRoutes()
  }

  genRoutes () {
    const routes = []
    const pageQuery = processPageQuery(this.pageQuery)
    const paginate = !!pageQuery.paginate.typeName

    if (this.route) {
      routes.push(new Route({
        type: paginate ? PAGED_TEMPLATE : DYNAMIC_TEMPLATE_ROUTE,
        path: genRoute(this.route, paginate),
        name: camelCase(this.name || this.typeName),
        component: this.component,
        typeName: this.typeName,
        pageQuery
      }, this))
    } else {
      const nodes = this.collection.collection.find()
      const length = nodes.length

      for (let i = 0; i < length; i++) {
        routes.push(new Route({
          type: paginate ? PAGED_STATIC_TEMPLATE : STATIC_TEMPLATE_ROUTE,
          path: genRoute(nodes[i].path, paginate),
          originalPath: nodes[i].path,
          chunkName: camelCase(this.name || this.typeName),
          component: this.component,
          typeName: this.typeName,
          pageQuery
        }, this))
      }
    }

    return routes
  }
}

class Route {
  constructor (options, page) {
    this.type = options.type
    this.name = options.name
    this.path = options.path
    this.typeName = options.typeName
    this.pageQuery = options.pageQuery
    this.component = options.component
    this.chunkName = options.chunkName
    this.isIndex = options.isIndex !== false
    this.originalPath = options.originalPath
    this.renderQueue = []
    this.page = page

    if (nonIndex.includes(options.originalPath)) {
      this.isIndex = false
    }
  }

  get withPageQuery () {
    return this.pageQuery.query !== null
  }

  get metaDataPath () {
    const name = this.chunkName || this.name
    return path.join(this.page.pages._dataDir, 'routes-meta', `${name}.json`)
  }

  initRenderQueue ({ schema, store }) {
    const rootFields = schema.getQueryType().getFields()
    const pageQuery = this.pageQuery

    switch (this.type) {
      case STATIC_ROUTE: {
        this.addRenderPath(this.path, this.page.context)

        break
      }

      case STATIC_TEMPLATE_ROUTE: {
        const node = store.getNodeByPath(this.path)
        const variables = contextValues(node, pageQuery.variables)
        this.addRenderPath(node.path, variables)

        break
      }

      case DYNAMIC_TEMPLATE_ROUTE: {
        const { collection } = store.getContentType(this.typeName)
        const nodes = collection.find()
        const length = nodes.length

        for (let i = 0; i < length; i++) {
          const variables = contextValues(nodes[i], pageQuery.variables)
          this.addRenderPath(nodes[i].path, variables)
        }

        break
      }

      case PAGED_STATIC_TEMPLATE: {
        const { fieldName } = pageQuery.paginate
        const { belongsTo } = rootFields[fieldName].type.getFields()
        const filter = belongsTo.args.find(arg => arg.name === 'filter')
        const fields = filter.type.getFields()
        const node = store.getNodeByPath(this.originalPath)
        const variables = contextValues(node, pageQuery.variables)
        const filters = pageQuery.getFilters(variables)
        const perPage = pageQuery.getPerPage(variables)
        const query = createFilterQuery(filters, fields)
        const key = createBelongsToKey(node)
        const totalNodes = store.index.count({ ...query, [key]: { $eq: true }})
        const totalPages = Math.ceil(totalNodes / perPage) || 1

        for (let i = 1; i <= totalPages; i++) {
          this.addRenderPath(node.path, { ...variables, page: i })
        }

        break
      }

      case PAGED_TEMPLATE: {
        const { fieldName } = pageQuery.paginate
        const { belongsTo } = rootFields[fieldName].type.getFields()
        const filter = belongsTo.args.find(arg => arg.name === 'filter')
        const fields = filter.type.getFields()
        const { collection } = store.getContentType(this.typeName)
        const nodes = collection.find()
        const length = nodes.length

        for (let i = 0; i < length; i++) {
          const node = nodes[i]
          const variables = contextValues(node, pageQuery.variables)
          const filters = pageQuery.getFilters(variables)
          const perPage = pageQuery.getPerPage(variables)
          const query = createFilterQuery(filters, fields)
          const key = createBelongsToKey(node)
          const totalNodes = store.index.count({ ...query, [key]: { $eq: true }})
          const totalPages = Math.ceil(totalNodes / perPage) || 1

          for (let i = 1; i <= totalPages; i++) {
            this.addRenderPath(node.path, { ...variables, page: i })
          }
        }

        break
      }

      case PAGED_ROUTE: {
        const { typeName, fieldName } = pageQuery.paginate
        const { args } = rootFields[fieldName]
        const { collection } = store.getContentType(typeName)
        const filter = args.find(arg => arg.name === 'filter')
        const fields = filter.type.getFields()
        const filters = pageQuery.getFilters()
        const perPage = pageQuery.getPerPage()
        const query = createFilterQuery(filters, fields)
        const totalNodes = collection.find(query).length
        const totalPages = Math.ceil(totalNodes / perPage) || 1

        for (let i = 1; i <= totalPages; i++) {
          this.addRenderPath(this.page.path, { page: i })
        }

        break
      }
    }
  }

  addRenderPath (path, variables = {}) {
    const render = new Render({ path, variables }, this)
    this.renderQueue.push(render)

    return render
  }
}

class Render {
  constructor ({ path, variables }, route) {
    this.segments = path.split('/').filter(v => !!v)
    this.variables = { ...variables, path }
    this.route = route
    this.hashSum = null
    this.group = null
    this.data = null

    if (this.variables.page > 1) {
      this.segments.push(this.variables.page)
    }
  }

  get path () {
    return `/${this.segments.join('/')}`
  }

  get withPageQuery () {
    return this.route.withPageQuery
  }

  get pageQuery () {
    return this.route.pageQuery
  }

  get htmlOutput () {
    const segments = this.segments.map(s => decodeURIComponent(s))
    const fileName = this.route.isIndex ? 'index.html' : `${segments.pop()}.html`
    return path.join(this.route.page.pages._outDir, ...segments, fileName)
  }

  get dataOutput () {
    return this.data
      ? path.join(this.route.page.pages._assetsDir, 'data', `${this.group}/${this.hashSum}.json`)
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

function genRoute (path, paginate = false) {
  const segments = path.split('/').filter(v => !!v)

  if (paginate) segments.push(':page(\\d+)?')

  return `/${segments.join('/')}`
}

module.exports = Pages
