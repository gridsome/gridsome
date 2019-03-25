const path = require('path')
const autoBind = require('auto-bind')
const { cloneDeep } = require('lodash')
const { Collection } = require('lokijs')
const isRelative = require('is-relative')
const { FSWatcher } = require('chokidar')
const EventEmitter = require('eventemitter3')
const parsePageQuery = require('../graphql/page-query')
const { createBelongsToKey } = require('../graphql/nodes/utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')
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

        this.findPages({ component }).forEach(page => {
          const oldPage = cloneDeep(page)
          const query = parsePageQuery(pageQuery, page.queryContext)

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

    if (oldPage) return this.updatePage(options)

    const component = isRelative(options.component)
      ? path.resolve(this._context, options.component)
      : options.component

    const { pageQuery } = this._parse(component)
    const page = createPage({ component, options })
    const query = parsePageQuery(pageQuery, page.queryContext)

    Object.assign(page, { query })
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
    const newPage = createPage({ component, options })
    const query = parsePageQuery(pageQuery, newPage.queryContext)

    const oldPage = cloneDeep(page)

    Object.assign(page, { query })
    Object.assign(page, newPage)
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

function createPage ({ component, options }) {
  const segments = options.path.split('/').filter(segment => !!segment)
  const path = `/${segments.join('/')}`

  // the /404 page must be named 404
  const name = path === NOT_FOUND_PATH ? NOT_FOUND_NAME : options.name

  return {
    name,
    path,
    component,
    chunkName: options.chunkName,
    context: options.context || null,
    queryContext: options.queryContext || options.context || null,
    internal: {
      route: options.route || null,
      isIndex: !nonIndex.includes(path),
      isDynamic: typeof options.route === 'string'
    }
  }
}

function createRoute ({ page, query }) {
  const { route } = page.internal
  const segments = route
    ? route.split('/').filter(segment => !!segment)
    : page.path.split('/').filter(segment => !!segment)

  let order = route ? 3 : 1

  if (query && query.paginate) {
    segments.push(':page(\\d+)?')
    order = route ? 3 : 2
  }

  return {
    order,
    route: `/${segments.join('/')}`
  }
}

function createRenderQueue (renderQueue, { pages, store, schema }) {
  for (const page of pages.allPages()) {
    if (page.query.paginate) {
      const totalPages = calcTotalPages(page, store, schema)

      for (let i = 1; i <= totalPages; i++) {
        renderQueue.push(createRenderEntry(page, i))
      }
    } else {
      renderQueue.push(createRenderEntry(page))
    }
  }

  return renderQueue
}

function calcTotalPages (page, store, schema) {
  const { belongsTo, fieldName, typeName, perPage } = page.query.paginate
  const rootFields = schema.getQueryType().getFields()

  let totalNodes = 0

  if (belongsTo) {
    const { args } = rootFields[fieldName].type.getFields().belongsTo
    const query = createCollectionQuery(args, page.query.filters)
    const node = store.getNodeByPath(page.path)

    query[createBelongsToKey(node)] = { $eq: true }

    totalNodes = store.index.count(query)
  } else {
    const { collection } = store.getContentType(typeName)
    const { args } = rootFields[fieldName]
    const query = createCollectionQuery(args, page.query.filters)

    totalNodes = collection.find(query).length
  }

  return Math.ceil(totalNodes / perPage) || 1
}

function createRenderEntry (page, currentPage = undefined) {
  const segments = page.path.split('/').filter(segment => !!segment)

  if (currentPage > 1) {
    segments.push(currentPage)
  }

  return {
    route: page.route,
    path: `/${segments.join('/')}`,
    component: page.component,
    context: page.context,
    query: page.query.document,
    isIndex: page.internal.isIndex,
    queryContext: createQueryContext(page, currentPage)
  }
}

function createQueryContext (page, currentPage = undefined) {
  return {
    ...page.query.context,
    page: currentPage,
    path: page.path
  }
}

function createCollectionQuery (args, filters) {
  const filter = args.find(arg => arg.name === 'filter')
  const fields = filter.type.getFields()

  return createFilterQuery(filters, fields)
}

module.exports = {
  Pages,
  createRenderQueue,
  createQueryContext
}
