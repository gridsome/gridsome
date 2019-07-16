const autoBind = require('auto-bind')
const Loki = require('lokijs')
const { FSWatcher } = require('chokidar')
const EventEmitter = require('eventemitter3')
const validateOptions = require('./validateOptions')
const createPageQuery = require('./createPageQuery')
const { NOT_FOUND_NAME, NOT_FOUND_PATH } = require('../utils/constants')

const isDev = process.env.NODE_ENV === 'development'

class Pages {
  constructor (app) {
    this._app = app
    this._context = app.context
    this._parser = app.parser
    this._cached = new Map()
    this._events = new EventEmitter()
    this._watcher = new FSWatcher({ disableGlobbing: true })
    this._watched = {}

    const db = new Loki()

    this._collection = db.addCollection('pages', {
      indices: ['path'],
      unique: ['path']
    })

    autoBind(this)

    if (isDev) {
      this._watcher.on('change', component => {
        const pages = this._collection.find({ component })
        const length = pages.length

        this._cached.delete(component)
        this._collection.adaptiveBinaryIndices = false

        for (let i = 0; i < length; i++) {
          const page = pages[i]

          this.updatePage({
            path: page.path,
            component: page.component,
            chunkName: page.chunkName || null,
            name: page.name || null,
            context: page.context || {},
            queryVariables: page.queryVariables || null,
            route: page.internal.route || null,
            _meta: page.internal.meta || null
          }, {
            digest: page.internal.digest,
            isManaged: page.internal.isManaged
          })
        }

        this._collection.adaptiveBinaryIndices = true
        this._collection.ensureAllIndexes(true)
      })
    }
  }

  on (eventName, fn, ctx) {
    return this._events.on(eventName, fn, ctx)
  }

  off (eventName, fn, ctx) {
    return this._events.removeListener(eventName, fn, ctx)
  }

  data () {
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

    const oldPage = this._collection.by('path', options.path)
    if (oldPage) return this.updatePage(options, internals, options)

    const { pageQuery } = this._parse(options.component)
    const page = createPage(options)
    const query = createPageQuery(pageQuery, page.queryVariables || page.context)

    Object.assign(page, { query })
    Object.assign(page, createRoute({ page, query }))
    Object.assign(page.internal, internals)

    this._collection.insert(page)
    this._events.emit('create', page)

    if (isDev) {
      this._watch(options.component)
    }

    return page
  }

  updatePage (input, internals = {}, normalizeOptions = null) {
    const options = normalizeOptions || this._normalizeOptions(input)
    const oldPage = this._collection.by('path', options.path)

    const useCache = this._cached.has(options.component)
    const { pageQuery } = this._parse(options.component, useCache)
    const page = createPage(options)
    const query = createPageQuery(pageQuery, page.queryVariables || page.context)

    Object.assign(page, { query })
    Object.assign(page, createRoute({ page, query }))
    Object.assign(page.internal, internals)

    page.$loki = oldPage.$loki
    page.meta = oldPage.meta

    this._collection.update(page)
    this._cached.set(options.component, true)
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

  removePagesByComponent (path) {
    const component = this._app.resolve(path)

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

    return this._app._hooks.page.call(options, this, this._app)
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

function createPage (options) {
  const segments = options.path.split('/').filter(segment => !!segment)
  const path = `/${segments.join('/')}`

  // the /404 page must be named 404
  const name = path === NOT_FOUND_PATH ? NOT_FOUND_NAME : options.name

  return {
    name,
    path,
    component: options.component,
    context: options.context || {},
    queryVariables: options.queryVariables || null,
    chunkName: options.chunkName || null,
    internal: {
      digest: null,
      path: { segments },
      route: options.route || null,
      meta: options._meta || {},
      isDynamic: typeof options.route === 'string',
      isManaged: false
    }
  }
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
