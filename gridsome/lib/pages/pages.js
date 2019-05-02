const path = require('path')
const autoBind = require('auto-bind')
const { Collection } = require('lokijs')
const { FSWatcher } = require('chokidar')
const EventEmitter = require('eventemitter3')
const validateOptions = require('./validateOptions')
const createPageQuery = require('./createPageQuery')
const { NOT_FOUND_NAME, NOT_FOUND_PATH } = require('../utils/constants')
const { cloneDeep } = require('lodash')
const { slugify } = require('../utils')

class Pages {
  constructor (app) {
    this._app = app
    this._context = app.context
    this._parser = app.parser
    this._events = new EventEmitter()
    this._watcher = new FSWatcher({ disableGlobbing: true })
    this._watched = {}
    this._created = []

    this._collection = new Collection({
      indices: ['path'],
      unique: ['path'],
      autoupdate: true
    })

    autoBind(this)

    if (process.env.NODE_ENV === 'development') {
      this._watcher.on('change', component => {
        const { pageQuery } = this._parse(component, false)

        this.findPages({ component }).forEach(page => {
          const oldPage = cloneDeep(page)
          const query = createPageQuery(pageQuery, page.queryVariables)

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

  createPage (input, internals = {}) {
    const options = this._normalizeOptions(input)
    const oldPage = this.findPage({ path: options.path })

    if (oldPage) return this.updatePage(options, internals)

    const { pageQuery } = this._parse(options.component)
    const page = createPage({ options, context: this._context })
    const query = createPageQuery(pageQuery, page.queryVariables)

    Object.assign(page, { query })
    Object.assign(page, createRoute({ page, query }))
    Object.assign(page.internal, internals)

    this._created.push(page)
    this._collection.insert(page)
    this._events.emit('create', page)

    if (process.env.NODE_ENV === 'development') {
      this._watch(options.component)
    }

    return page
  }

  updatePage (input, internals = {}) {
    const options = this._normalizeOptions(input)
    const page = this.findPage({ path: options.path })

    const { pageQuery } = this._parse(options.component, false)
    const newPage = createPage({ options, context: this._context })
    const query = createPageQuery(pageQuery, newPage.queryVariables)

    const oldPage = cloneDeep(page)

    Object.assign(page, { query })
    Object.assign(page, newPage)
    Object.assign(page, createRoute({ page, query }))
    Object.assign(page.internal, internals)

    this._events.emit('update', page, oldPage)

    return page
  }

  removePage (page) {
    const query = { path: page.path }

    this._collection.findAndRemove(query)
    this._events.emit('remove', page)
    this._unwatch(page.component)
  }

  removePageByPath (path) {
    const query = { path }
    const page = this._collection.findOne(query)

    if (page) {
      this._collection.findAndRemove(query)
      this._events.emit('remove', page)
      this._unwatch(page.component)
    }
  }

  removePagesByComponent (component) {
    this._collection.find({ component }).forEach(page => {
      this._events.emit('remove', page)
    })

    this._collection.findAndRemove({ component })
    this._unwatch(component)
  }

  findAndRemovePages (query) {
    this._collection.find(query).forEach(page => {
      this.removePage(page)
    })
  }

  _normalizeOptions (input = {}) {
    const options = validateOptions(input)

    options.component = this._app.resolve(input.component)

    return options
  }

  _parse (component, useCache = true) {
    return this._parser.parse(component, useCache)
  }

  _watch (component) {
    if (!this._watched[component]) {
      this._watched[component] = true
      this._watcher.add(component)
    }
  }

  _unwatch (component) {
    if (this._collection.find({ component }).length <= 0) {
      delete this._watched[component]
      this._watcher.unwatch(component)
    }
  }
}

function createPage ({ options, context }) {
  const segments = options.path.split('/').filter(segment => !!segment)
  const path = `/${segments.join('/')}`

  // the /404 page must be named 404
  const name = path === NOT_FOUND_PATH ? NOT_FOUND_NAME : options.name

  return {
    name,
    path,
    component: options.component,
    context: options.context || null,
    queryVariables: options.queryVariables || options.context || null,
    chunkName: options.chunkName || genChunkName(options.component, context),
    internal: {
      digest: null,
      path: { segments },
      route: options.route || null,
      isDynamic: typeof options.route === 'string',
      isManaged: false
    }
  }
}

function genChunkName (component, context) {
  const chunkName = path.relative(context, component)
    .split('/')
    .filter(s => s !== '..')
    .map(s => slugify(s))
    .join('--')

  return `page--${chunkName}`
}

function createRoute ({ page, query }) {
  const { route, path: { segments: pathSegments }} = page.internal
  const segments = route
    ? route.split('/').filter(segment => !!segment)
    : pathSegments.slice()

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

module.exports = Pages
