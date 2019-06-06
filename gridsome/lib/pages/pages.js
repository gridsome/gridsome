const path = require('path')
const fs = require('fs-extra')
const { Collection } = require('lokijs')
const { FSWatcher } = require('chokidar')
const { SyncBailHook } = require('tapable')
const EventEmitter = require('eventemitter3')
const validateOptions = require('./validateOptions')
const createPageQuery = require('./createPageQuery')
const { slugify, hashString } = require('../utils')
const SyncBailWaterfallHook = require('../app/SyncBailWaterfallHook')
const { debounce } = require('lodash')

const {
  BOOTSTRAP_PAGES,
  NOT_FOUND_NAME,
  NOT_FOUND_PATH
} = require('../utils/constants')

class Pages {
  constructor (app) {
    this._app = app
    this._context = app.context
    this._events = new EventEmitter()
    this._watcher = new FSWatcher({ disableGlobbing: true })
    this._watched = new Map()
    this._cached = new Map()

    this._collection = new Collection({
      indices: ['path'],
      unique: ['path'],
      disableMeta: true
    })

    this.hooks = {
      parseComponent: new SyncBailHook(['source', 'resource']),
      createPage: new SyncBailWaterfallHook(['options'])
    }

    app.hooks.renderQueue.tap(
      { name: 'GridsomePages', before: 'GridsomeSchema' },
      require('./createRenderQueue')
    )

    app.hooks.renderQueue.tap(
      { name: 'GridsomePages', before: 'GridsomeSchema' },
      require('./createHTMLPaths')
    )

    app.hooks.bootstrap.tapPromise(
      {
        name: 'GridsomePages',
        label: 'Create pages and templates',
        phase: BOOTSTRAP_PAGES
      },
      () => this.createPages()
    )

    if (process.env.NODE_ENV === 'development') {
      const createPages = debounce(() => this.createPages(), 16)
      const fetchQueries = debounce(() => app.broadcast({ type: 'fetch' }), 16)
      const generateRoutes = debounce(() => app.codegen.generate('routes.js'), 16)

      app.store.on('change', createPages)
      this.on('create', generateRoutes)
      this.on('remove', generateRoutes)

      this.on('update', (page, oldPage) => {
        const { path: oldPath, query: oldQuery } = oldPage
        const { path, query } = page

        if (
          (path !== oldPath && !page.internal.isDynamic) ||
          // pagination was added or removed in page-query
          (query.paginate && !oldQuery.paginate) ||
          (!query.paginate && oldQuery.paginate) ||
          // page-query was created or removed
          (query.document && !oldQuery.document) ||
          (!query.document && oldQuery.document)
        ) {
          return generateRoutes()
        }

        fetchQueries()
      })

      this._watcher.on('change', filePath => {
        const component = this._parse(filePath, false)

        this.findPages({ component: filePath }).forEach(oldPage => {
          const normalized = this._createPage(oldPage.internal.input, component)
          const page = app.hooks.createPage.call(normalized)

          if (!page) {
            this.removePage(oldPage)
          }

          page.meta = oldPage.meta
          page.$loki = oldPage.$loki
          page.internal = { ...oldPage.internal, ...page.internal }

          this._collection.update(page)
          this._events.emit('update', page, oldPage)
        })
      })
    }
  }

  getHooksContext () {
    return {
      hooks: this.hooks
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

  async createPages () {
    const digest = hashString(Date.now().toString())
    const { createPagesAPI, createManagedPagesAPI } = require('../pages/utils')

    await this._app.events.dispatch('createPages', api => {
      return createPagesAPI(api, { digest })
    })

    await this._app.events.dispatch('createManagedPages', api => {
      return createManagedPagesAPI(api, { digest })
    })

    // ensure a /404 page exists
    if (!this.findPage({ path: '/404' })) {
      this.createPage({
        path: '/404',
        component: path.join(this._app.config.appPath, 'pages', '404.vue')
      }, { digest, isManaged: true })
    }

    // remove unmanaged pages created
    // in earlier digest cycles
    this.findAndRemovePages({
      'internal.digest': { $ne: digest },
      'internal.isManaged': { $eq: false }
    })
  }

  createPage (input, internals = {}) {
    const options = this._normalizeOptions(input)
    const oldPage = this.findPage({ path: options.path })

    if (oldPage) {
      return this.updatePage(options, internals, oldPage)
    }

    const component = this._parse(options.component)
    const normalized = this._createPage(options, component)
    const page = this.hooks.createPage.call(normalized)

    if (!page) return null

    page.internal = { ...page.internal, ...internals, input }

    this._collection.insert(page)
    this._events.emit('create', page)

    if (process.env.NODE_ENV === 'development') {
      this._watch(options.component)
    }

    return page
  }

  updatePage (input, internals = {}, oldPage = this.findPage({ path: input.path })) {
    const options = this._normalizeOptions(input)
    const component = this._parse(options.component, false)
    const normalized = this._createPage(options, component)
    const page = this.hooks.createPage.call(normalized)

    if (!page) {
      this.removePage(oldPage)
      return null
    }

    page.meta = oldPage.meta
    page.$loki = oldPage.$loki
    page.internal = { ...page.internal, ...internals, input }

    this._collection.update(page)
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

    return options
  }

  _parse (component, useCache = true) {
    if (useCache && this._cached.has(component)) {
      return this._cached.get(component)
    }

    const source = fs.readFileSync(component, 'utf-8')
    const results = this.hooks.parseComponent.call(source, {
      resourcePath: component
    })

    this._cached.set(component, results)

    return results
  }

  _createPage (options, component) {
    const page = createPage({ options, context: this._context })
    const queryVariables = page.queryVariables || page.context
    const query = createPageQuery(component.pageQuery, queryVariables)

    Object.assign(page, { query })
    Object.assign(page, createRoute({ page, query }))

    return page
  }

  _watch (component) {
    if (!this._watched.has(component)) {
      this._watched.set(component, true)
      this._watcher.add(component)
    }
  }

  _unwatch (component) {
    if (this._collection.find({ component }).length <= 0) {
      this._watched.delete(component)
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
    context: options.context || {},
    queryVariables: options.queryVariables || null,
    chunkName: options.chunkName || genChunkName(options.component, context),
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
