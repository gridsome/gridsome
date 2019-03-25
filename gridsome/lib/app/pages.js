const path = require('path')
const autoBind = require('auto-bind')
const { cloneDeep } = require('lodash')
const { Collection } = require('lokijs')
const isRelative = require('is-relative')
const { FSWatcher } = require('chokidar')
const EventEmitter = require('eventemitter3')
const { createBelongsToKey } = require('../graphql/nodes/utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
const { parsePageQuery, processPageQuery, contextValues } = require('../graphql/page-query')
const { NOT_FOUND_NAME, NOT_FOUND_PATH } = require('../utils/constants')

const nonIndex = [NOT_FOUND_PATH]

class Pages {
  constructor (app) {
    this._context = app.context
    this._parsers = app.config.componentParsers
    this._events = new EventEmitter()
    this._watcher = new FSWatcher({ disableGlobbing: true })
    this._watchedComponents = {}

    this._collection = new Collection({
      indices: ['path'],
      unique: ['path'],
      autoupdate: true
    })

    autoBind(this)

    if (process.env.NODE_ENV === 'development') {
      this._watcher.on('change', component => {
        const { pageQuery } = this._parse(component)
        const query = createQuery(pageQuery)

        this.findPages({ component }).forEach(page => {
          const oldPage = cloneDeep(page)

          Object.assign(page, { query })
          Object.assign(page, createRoute({ page, query }))

          this._events.emit('update', page, oldPage)
        })
      })
    }
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

  findPages (query) {
    return this._collection.find(query)
  }

  findPage (query) {
    return this._collection.findOne(query)
  }

  createPage (options) {
    const oldPage = this.findPage({ path: options.path })
    const page = {}

    if (oldPage) return this.updatePage(options)

    const component = isRelative(options.component)
      ? path.resolve(this._context, options.component)
      : options.component

    const { pageQuery } = this._parse(component)
    const query = createQuery(pageQuery)

    Object.assign(page, { query })
    Object.assign(page, createPage({ component, query, options }))
    Object.assign(page, createRoute({ page, query }))

    this._collection.insert(page)
    this._events.emit('create', page)

    if (process.env.NODE_ENV === 'development') {
      this._watch(component)
    }

    return page
  }

  updatePage (options) {
    const page = this.findPage({ path: options.path })
    const component = isRelative(options.component)
      ? path.resolve(this._context, options.component)
      : options.component
    const { pageQuery } = this._parse(component)
    const query = createQuery(pageQuery)

    const oldPage = cloneDeep(page)

    Object.assign(page, { query })
    Object.assign(page, createPage({ component, query, options }))
    Object.assign(page, createRoute({ page, query }))

    this._events.emit('update', page, oldPage)

    return page
  }

  removePage (query) {
    const page = this.findPage(query)

    if (page) {
      this._collection.findAndRemove(query)
      this._events.emit('remove', page)
      this._unwatch(page.component)
    }
  }

  _parse (file) {
    const parser = this._parsers.find(options => file.match(options.test))
    return parser ? parser.parse(file) : {}
  }

  _watch (component) {
    if (!this._watchedComponents[component]) {
      this._watchedComponents[component] = true
      this._watcher.add(component)
    }
  }

  _unwatch (component) {
    if (this.findPages({ component }).length <= 0) {
      this._watcher.unwatch(component)
    }
  }
}

function createQuery (pageQuery) {
  const parsedPageQuery = parsePageQuery(pageQuery)
  return processPageQuery(parsedPageQuery)
}

function createPage ({ component, query, options }) {
  const segments = options.path.split('/').filter(segment => !!segment)
  const path = `/${segments.join('/')}`

  const name = path === NOT_FOUND_PATH ? NOT_FOUND_NAME : options.name

  return {
    name,
    path,
    component,
    chunkName: options.chunkName,
    context: options.context || null,
    queryContext: options.queryContext || null,
    internal: {
      route: options.route || null,
      isIndex: !nonIndex.includes(path),
      isDynamic: typeof options.route === 'string'
    }
  }
}

function createRoute ({ page, query }) {
  let segments = page.path.split('/').filter(segment => !!segment).filter(segment => !!segment)
  let order = 1

  if (page.internal.route) {
    segments = page.internal.route.split('/').filter(segment => !!segment)
    order = 3
  }

  if (query.paginate.typeName) {
    segments.push(':page(\\d+)?')
    order = page.internal.route ? 3 : 2
  }

  return {
    order,
    route: `/${segments.join('/')}`
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
