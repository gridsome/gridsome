const path = require('path')
const autoBind = require('auto-bind')
const { cloneDeep } = require('lodash')
const { Collection } = require('lokijs')
const isRelative = require('is-relative')
const EventEmitter = require('eventemitter3')
const { createBelongsToKey } = require('../graphql/nodes/utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
const { parsePageQuery, processPageQuery, contextValues } = require('../graphql/page-query')

const nonIndex = ['/404']

class Pages {
  constructor (app) {
    this._context = app.context
    this._parsers = app.config.componentParsers
    this._events = new EventEmitter()

    this._collection = new Collection({
      indices: ['path'],
      unique: ['path'],
      autoupdate: true
    })

    autoBind(this)
  }

  on (eventName, fn, ctx) {
    return this._events.on(eventName, fn, ctx)
  }

  off (eventName, fn, ctx) {
    return this._events.removeListener(eventName, fn, ctx)
  }

  allPages () {
    return this._collection.chain().simplesort('order').data()
  }

  findPage (query) {
    return this._collection.findOne(query)
  }

  createPage (options) {
    const oldPage = this.findPage({ path: options.path })

    if (oldPage) return this.updatePage(options)

    const component = isRelative(options.component)
      ? path.resolve(this._context, options.component)
      : options.component

    const { pageQuery } = this._parse(component)
    const page = createPage({ component, pageQuery, options })

    this._collection.insert(page)
    this._events.emit('create', page)

    return page
  }

  updatePage (options) {
    const page = this.findPage({ path: options.path })
    const component = isRelative(options.component)
      ? path.resolve(this._context, options.component)
      : options.component
    const { pageQuery } = this._parse(component)
    const oldNode = cloneDeep(page)

    Object.assign(page, createPage({ component, pageQuery, options }))
    this._events.emit('update', page, oldNode)

    return page
  }

  removePage (query) {
    const page = this.findPage(query)

    if (page) {
      this._collection.findAndRemove(query)
      this._events.emit('remove', page)
    }
  }

  _parse (file) {
    const parser = this._parsers.find(options => file.match(options.test))
    return parser ? parser.parse(file) : {}
  }
}

function createPage ({ component, pageQuery, options }) {
  const parsedPageQuery = parsePageQuery(pageQuery)
  const segments = options.path.split('/').filter(segment => !!segment)
  const path = `/${segments.join('/')}`
  let routeSegments = segments.slice()
  let order = 1

  if (options.route) {
    order = 3
    routeSegments = options.route.split('/').filter(segment => !!segment)
  }

  if (parsedPageQuery.paginate) {
    routeSegments.push(':page(\\d+)?')
    order = options.route ? 3 : 2
  }

  return {
    order,
    path,
    component,
    name: options.name,
    chunkName: path === '/' ? 'home' : options.chunkName,
    route: `/${routeSegments.join('/')}`,
    context: options.context || null,
    queryContext: options.queryContext || null,
    query: processPageQuery(parsedPageQuery),
    internal: {
      isIndex: !nonIndex.includes(path),
      isDynamic: typeof options.route === 'string',
      isAutoCreated: options.autoCreated === true
    }
  }
}

function createRenderQueue (renderQueue, { pages, store, schema }) {
  for (const page of pages.allPages()) {
    const context = page.queryContext || page.context || {}
    const variables = contextValues(context, page.query.variables)

    if (page.query.paginate.typeName) {
      const totalPages = calcTotalPages(page, variables, store, schema)

      for (let i = 1; i <= totalPages; i++) {
        renderQueue.push(createRenderEntry(page, { ...variables, page: i }))
      }
    } else {
      renderQueue.push(createRenderEntry(page, variables))
    }
  }

  return renderQueue
}

function calcTotalPages (page, variables, store, schema) {
  const { belongsTo, fieldName, typeName } = page.query.paginate
  const rootFields = schema.getQueryType().getFields()

  const filters = page.query.getFilters(variables)
  const perPage = page.query.getPerPage(variables)

  let totalNodes = 0

  if (belongsTo) {
    const { args } = rootFields[fieldName].type.getFields().belongsTo
    const query = createCollectionQuery(args, filters)
    const node = store.getNodeByPath(page.path)

    query[createBelongsToKey(node)] = { $eq: true }

    totalNodes = store.index.count(query)
  } else {
    const { collection } = store.getContentType(typeName)
    const { args } = rootFields[fieldName]
    const query = createCollectionQuery(args, filters)

    totalNodes = collection.find(query).length
  }

  return Math.ceil(totalNodes / perPage) || 1
}

function createRenderEntry (page, variables = {}) {
  const segments = page.path.split('/').filter(segment => !!segment)
  const originalPath = `/${segments.join('/')}`

  if (variables.page > 1) {
    segments.push(variables.page)
  }

  return {
    route: page.route,
    path: `/${segments.join('/')}`,
    component: page.component,
    queryContext: { ...variables, path: originalPath },
    context: page.context,
    query: page.query.query,
    isIndex: page.internal.isIndex
  }
}

function createCollectionQuery (args, filters) {
  const filter = args.find(arg => arg.name === 'filter')
  const fields = filter.type.getFields()

  return createFilterQuery(filters, fields)
}

module.exports = {
  Pages,
  createRenderQueue
}
