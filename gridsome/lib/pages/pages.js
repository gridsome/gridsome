const fs = require('fs-extra')
const Loki = require('lokijs')
const crypto = require('crypto')
const invariant = require('invariant')
const initWatcher = require('./watch')
const { FSWatcher } = require('chokidar')
const pathToRegexp = require('path-to-regexp')
const createPageQuery = require('./createPageQuery')
const { SyncWaterfallHook, SyncBailHook } = require('tapable')
const SyncBailWaterfallHook = require('../app/SyncBailWaterfallHook')
const { BOOTSTRAP_PAGES } = require('../utils/constants')
const createRenderQueue = require('./createRenderQueue')
const { validate } = require('./validateOptions')
const { normalizePath } = require('./utils')
const { hashString } = require('../utils')

const isDev = process.env.NODE_ENV === 'development'

class Pages {
  constructor (app) {
    this.app = app

    app.hooks.bootstrap.tapPromise(
      {
        name: 'GridsomePages',
        label: 'Create pages and templates',
        phase: BOOTSTRAP_PAGES
      },
      () => this.createPages()
    )

    this.hooks = {
      parseComponent: new SyncBailHook(['source', 'resource']),
      createRoute: new SyncWaterfallHook(['options']),
      createPage: new SyncWaterfallHook(['options']),
      addEntry: new SyncBailWaterfallHook(['options'])
    }

    createRenderQueue(app.hooks)

    this._watched = new Map()
    this._cache = new Map()
    this._watcher = null

    const db = new Loki()

    this._routes = db.addCollection('routes', {
      indices: ['id'],
      unique: ['id', 'path'],
      disableMeta: true
    })

    this._pages = db.addCollection('pages', {
      indices: ['id'],
      unique: ['id', 'path'],
      disableMeta: true
    })

    if (isDev) {
      this._watcher = new FSWatcher({
        disableGlobbing: true
      })

      initWatcher(app, this)
    }
  }

  routes () {
    return this._routes
      .chain()
      .simplesort('internal.priority', true)
      .data()
      .map(route => {
        return new Route(route, this)
      })
  }

  pages () {
    return this._pages.data.slice()
  }

  clearCache () {
    this._cache.clear()
  }

  clearComponentCache (component) {
    this._cache.delete(component)
  }

  disableIndices () {
    this._routes.adaptiveBinaryIndices = false
    this._pages.adaptiveBinaryIndices = false
  }

  enableIndices () {
    this._routes.ensureAllIndexes()
    this._pages.ensureAllIndexes()
    this._routes.adaptiveBinaryIndices = true
    this._pages.adaptiveBinaryIndices = true
  }

  async createPages () {
    const digest = hashString(Date.now().toString())
    const { createPagesAPI, createManagedPagesAPI } = require('./utils')

    this.clearCache()

    if (this.app.isBootstrapped) {
      this.disableIndices()
    }

    await this.app.events.dispatch('createPages', api => {
      return createPagesAPI(api, { digest })
    })

    await this.app.events.dispatch('createManagedPages', api => {
      return createManagedPagesAPI(api, { digest })
    })

    this.enableIndices()

    // remove unmanaged pages created in earlier digest cycles
    const query = {
      'internal.digest': { $ne: digest },
      'internal.isManaged': { $eq: false }
    }

    this._routes.findAndRemove(query)
    this._pages.findAndRemove(query)
  }

  createRoute (input, meta = {}) {
    const options = this._createRouteOptions(input, meta)
    const oldRoute = this._routes.by('id', options.id)

    if (oldRoute) {
      options.$loki = oldRoute.$loki
      options.meta = oldRoute.meta

      this._routes.update(options)

      return new Route(options, this)
    }

    this._routes.insert(options)
    this._watchComponent(options.component)

    return new Route(options, this)
  }

  updateRoute (input, meta = {}) {
    const options = this._createRouteOptions(input, meta)
    const route = this._routes.by('id', options.id)

    options.$loki = route.$loki
    options.meta = route.meta

    this._routes.update(options)

    return new Route(options, this)
  }

  removeRoute (id) {
    const options = this._routes.by('id', id)
    const route = new Route(options, this)

    route.pages().forEach(page => {
      route.removePage(page.id)
    })

    this._routes.findAndRemove({ id })
    this._unwatchComponent(route.component)
  }

  createPage (input, meta = {}) {
    const route = this.createRoute({
      path: input.path,
      component: input.component
    }, meta)

    return route.addPage({
      path: input.path,
      context: input.context,
      queryVariables: input.queryVariables
    })
  }

  updatePage (input, meta = {}) {
    const route = this.updateRoute({
      path: input.path,
      component: input.component
    }, meta)

    return route.updatePage({
      path: input.path,
      context: input.context,
      queryVariables: input.queryVariables
    })
  }

  removePage (id) {
    const page = this.getPage(id)
    const route = this.getRoute(page.internal.route)

    if (page.path === route.path) {
      return this.removeRoute(route.id)
    }

    route.removePage(id)
  }

  removePageByPath (path) {
    const page = this._pages.by('path', path)

    if (page) {
      this.removePage(page.id)
    }
  }

  removePagesByComponent (path) {
    const component = this.app.resolve(path)

    this._routes
      .find({ component })
      .forEach(options => {
        this.removeRoute(options.id)
      })
  }

  getRoute (id) {
    const options = this._routes.by('id', id)
    return options ? new Route(options, this) : null
  }

  getPage (id) {
    return this._pages.by('id', id)
  }

  _createRouteOptions (input, meta = {}, op = 'create') {
    const options = validate('route', input)
    const component = this.app.resolve(options.component)
    const { pageQuery } = this._parseComponent(component, op === 'create')
    const { source, document, paginate } = createPageQuery(pageQuery)
    const { type, name } = options

    let path = normalizePath(options.path)

    const regexp = pathToRegexp(path)
    const id = crypto.createHash('md5').update(`route-${path}`).digest('hex')

    if (paginate) {
      const segments = path.split('/').filter(Boolean)
      path = `/${segments.concat(':page(\\d+)?').join('/')}`
    }

    const priority = this._resolvePriority(path)

    return this.hooks.createRoute.call({
      id,
      type,
      name,
      path,
      component,
      internal: Object.assign({}, meta, {
        priority,
        regexp,
        query: {
          source,
          document,
          paginate: !!paginate
        }
      })
    })
  }

  _resolvePriority (path) {
    let priority = (path.match(/\//g) || []).length * 10

    if (/:/.test(path)) {
      priority -= 5

      if (path.indexOf(':') === 1) priority -= 2
      if (/\(.*\)/.test(path)) priority += 1
      if (/(\?|\+|\*)$/.test(path)) priority -= 1
      if (/\/[^:]$/.test(path)) priority += 1
    }

    return priority
  }

  _parseComponent (component) {
    if (this._cache.has(component)) {
      return this._cache.get(component)
    }

    const source = fs.readFileSync(component, 'utf-8')
    const results = this.hooks.parseComponent.call(source, {
      resourcePath: component
    })

    this._cache.set(component, validate('component', results))

    return results
  }

  _watchComponent (component) {
    if (!this._watched.has(component)) {
      this._watched.set(component, true)
      if (this._watcher) this._watcher.add(component)
    }
  }

  _unwatchComponent (component) {
    if (this._routes.find({ component }).length <= 0) {
      this._watched.delete(component)
      if (this._watcher) this._watcher.unwatch(component)
    }
  }
}

class Route {
  constructor (options, factory) {
    this.type = options.type
    this.id = options.id
    this.name = options.name
    this.path = options.path
    this.component = options.component
    this.internal = options.internal
    this.options = options

    Object.defineProperty(this, '_factory', {
      value: factory
    })
  }

  pages () {
    return this._factory._pages.find({
      'internal.route': this.id
    })
  }

  addPage (input) {
    const options = this._createPageOptions(input)
    const oldPage = this._factory._pages.by('id', options.id)

    if (oldPage) {
      options.$loki = oldPage.$loki
      options.meta = oldPage.meta

      this._factory._pages.update(options)
    } else {
      this._factory._pages.insert(options)
    }

    return options
  }

  updatePage (input) {
    const options = input.id ? input : this._createPageOptions(input)
    const oldOptions = this._factory._pages.by('id', options.id)

    options.$loki = oldOptions.$loki
    options.meta = oldOptions.meta

    this._factory._pages.update(options)

    return options
  }

  removePage (id) {
    const options = this._factory.getPage(id)

    invariant(options.internal.route === this.id, `Cannot remove ${options.path}`)

    this._factory._pages.findAndRemove({ id })
  }

  _createPageOptions (input) {
    const { regexp, digest, isManaged, query } = this.internal
    const { path: _path, context, queryVariables } = validate('page', input)
    const normalPath = normalizePath(_path)
    const id = crypto.createHash('md5').update(`page-${normalPath}`).digest('hex')

    if (normalPath !== this.path) {
      invariant(regexp.test(normalPath), `Page path does not match route path: ${normalPath}`)
    }

    invariant(!/:/.test(normalPath), `Path params for route pages are not allowed: ${normalPath}`)

    const { paginate, variables, filters } = createPageQuery(
      query.source,
      queryVariables || context
    )

    return this._factory.hooks.createPage.call({
      id,
      path: normalPath,
      context,
      internal: {
        route: this.id,
        digest,
        isManaged,
        query: {
          paginate,
          variables,
          filters
        }
      }
    })
  }
}

module.exports = Pages
