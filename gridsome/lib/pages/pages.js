const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const invariant = require('invariant')
const initWatcher = require('./watch')
const { Collection } = require('lokijs')
const { FSWatcher } = require('chokidar')
const pathToRegexp = require('path-to-regexp')
const createPageQuery = require('./createPageQuery')
const { HookMap, SyncWaterfallHook, SyncBailHook } = require('tapable')
const { BOOTSTRAP_PAGES } = require('../utils/constants')
const validateInput = require('./schemas')
const { normalizePath } = require('./utils')
const { hashString } = require('../utils')
const { snakeCase } = require('lodash')

const TYPE_STATIC = 'static'
const TYPE_DYNAMIC = 'dynamic'
const isDev = process.env.NODE_ENV === 'development'

const createHash = value => crypto.createHash('md5').update(value).digest('hex')
const getRouteType = value => /:/.test(value) ? TYPE_DYNAMIC : TYPE_STATIC

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
      parseComponent: new HookMap(() => new SyncBailHook(['source', 'resource'])),
      createRoute: new SyncWaterfallHook(['options']),
      createPage: new SyncWaterfallHook(['options'])
    }

    this._watched = new Map()
    this._cache = new Map()
    this._watcher = null

    ;['routes', 'pages'].forEach(name => {
      this[`_${name}`] = new Collection(name, {
        indices: ['id'],
        unique: ['id', 'path'],
        disableMeta: true
      })
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
    ['_routes', '_pages'].forEach(prop => {
      this[prop].configureOptions({
        adaptiveBinaryIndices: false
      })
    })
  }

  enableIndices () {
    ['_routes', '_pages'].forEach(prop => {
      this[prop].ensureAllIndexes()
      this[prop].configureOptions({
        adaptiveBinaryIndices: true
      })
    })
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

    this.enableIndices()

    await this.app.events.dispatch('createManagedPages', api => {
      return createManagedPagesAPI(api, { digest })
    })

    // remove unmanaged pages created in earlier digest cycles
    const query = {
      'internal.digest': { $ne: digest },
      'internal.isManaged': { $eq: false }
    }

    this._routes.findAndRemove(query)
    this._pages.findAndRemove(query)
  }

  createRoute (input, meta = {}) {
    const validated = validateInput('route', input)
    const options = this._createRouteOptions(validated, meta)
    const oldRoute = this._routes.by('id', options.id)

    if (oldRoute) {
      const newOptions = Object.assign({}, options, {
        $loki: oldRoute.$loki,
        meta: oldRoute.meta
      })

      this._routes.update(newOptions)

      return new Route(newOptions, this)
    }

    this._routes.insert(options)
    this._watchComponent(options.component)

    return new Route(options, this)
  }

  updateRoute (input, meta = {}) {
    const validated = validateInput('route', input)
    const options = this._createRouteOptions(validated, meta)
    const route = this._routes.by('id', options.id)
    const newOptions = Object.assign({}, options, {
      $loki: route.$loki,
      meta: route.meta
    })

    this._routes.update(newOptions)

    return new Route(newOptions, this)
  }

  removeRoute (id) {
    const options = this._routes.by('id', id)

    this._pages.findAndRemove({ 'internal.route': id })
    this._routes.findAndRemove({ id })
    this._unwatchComponent(options.component)
  }

  createPage (input, meta = {}) {
    if (input.route) {
      // TODO: remove this route workaround
      const options = this._routes.by('path', input.route)
      let route = options ? new Route(options, this) : null

      if (!route) {
        route = this.createRoute({
          path: input.route,
          component: input.component
        }, meta)
      }

      route.addPage({
        path: input.path,
        context: input.context,
        queryVariables: input.queryVariables
      })

      return
    }

    delete input.route

    const options = validateInput('page', input)
    const type = getRouteType(options.path)

    const route = this.createRoute({
      type,
      name: options.name,
      path: options.path,
      component: options.component
    }, meta)

    return route.addPage({
      path: options.path,
      context: options.context,
      queryVariables: options.queryVariables
    })
  }

  updatePage (input, meta = {}) {
    const options = validateInput('page', input)
    const type = getRouteType(options.path)

    const route = this.updateRoute({
      type,
      name: options.name,
      path: options.path,
      component: options.component
    }, meta)

    return route.updatePage({
      path: options.path,
      context: options.context,
      queryVariables: options.queryVariables
    })
  }

  removePage (id) {
    const page = this.getPage(id)
    const route = this.getRoute(page.internal.route)

    if (route.internal.isDynamic) {
      route.removePage(id)
    } else {
      this.removeRoute(route.id)
    }
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

  _createRouteOptions (options, meta = {}) {
    const component = this.app.resolve(options.component)
    const { pageQuery } = this._parseComponent(component)
    const { source, document, paginate } = createPageQuery(pageQuery)

    const type = options.type
    const normalPath = normalizePath(options.path)
    const isDynamic = /:/.test(normalPath)
    let name = options.name
    let path = normalPath

    const regexp = pathToRegexp(path)
    const id = createHash(`route-${path}`)

    if (paginate) {
      const segments = path.split('/').filter(Boolean)
      path = `/${segments.concat(':page(\\d+)?').join('/')}`
    }

    if (type === TYPE_DYNAMIC) {
      name = name || `__${snakeCase(normalPath)}`
    }

    const priority = this._resolvePriority(path)

    return this.hooks.createRoute.call({
      id,
      type,
      name,
      path,
      component,
      internal: Object.assign({}, meta, {
        path: normalPath,
        isDynamic,
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
    const segments = path.substring(1).split('/')
    const scores = segments.map(segment => {
      let score = Math.max(segment.charCodeAt(0) || 0, 90)
      const parts = (segment.match(/-/g) || []).length

      if (/^:/.test(segment)) score -= 10
      if (/:/.test(segment)) score -= 10
      if (/\(.*\)/.test(segment)) score += 5
      if (/\/[^:]$/.test(segment)) score += 3
      if (/(\?|\+|\*)$/.test(segment)) score -= 3
      if (/\(\.\*\)/.test(segment)) score -= 10
      if (parts) score += parts

      return score
    })

    return scores.reduce(
      (sum, score) => sum + score,
      segments.length * 100
    )
  }

  _parseComponent (component) {
    if (this._cache.has(component)) {
      return this._cache.get(component)
    }

    const ext = path.extname(component).substring(1)
    const hook = this.hooks.parseComponent.get(ext)
    let results

    if (hook) {
      const source = fs.readFileSync(component, 'utf8')
      results = hook.call(source, { resourcePath: component })
    }

    this._cache.set(component, validateInput('component', results || {}))

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

    Object.defineProperty(this, '_pages', { value: factory._pages })
    Object.defineProperty(this, '_createPage', { value: factory.hooks.createPage })
  }

  pages () {
    return this._pages.find({
      'internal.route': this.id
    })
  }

  addPage (input) {
    const options = this._createPageOptions(input)
    const oldPage = this._pages.by('id', options.id)

    if (oldPage) {
      options.$loki = oldPage.$loki
      options.meta = oldPage.meta

      this._pages.update(options)
    } else {
      this._pages.insert(options)
    }

    return options
  }

  updatePage (input) {
    const options = input.id ? input : this._createPageOptions(input)
    const oldOptions = this._pages.by('id', options.id)
    const newOptions = Object.assign({}, options, {
      $loki: oldOptions.$loki,
      meta: oldOptions.meta
    })

    this._pages.update(newOptions)

    return newOptions
  }

  removePage (id) {
    this._pages.findAndRemove({ id, 'internal.route': this.id })
  }

  _createPageOptions (input) {
    const { regexp, digest, isManaged, query } = this.internal
    const { path: _path, context, queryVariables } = validateInput('routePage', input)
    const normalPath = normalizePath(_path)
    const isDynamic = /:/.test(normalPath)
    const id = createHash(`page-${normalPath}`)

    if (this.type === TYPE_STATIC) {
      invariant(
        regexp.test(normalPath),
        `Page path does not match route path: ${normalPath}`
      )
    }

    if (this.type === TYPE_DYNAMIC) {
      invariant(
        this.internal.path === normalPath,
        `Dynamic page must equal the route path: ${this.internal.path}`
      )
    }

    const { paginate, variables, filters } = createPageQuery(
      query.source,
      queryVariables || context
    )

    return this._createPage.call({
      id,
      path: normalPath,
      context,
      internal: {
        route: this.id,
        digest,
        isManaged,
        isDynamic,
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
