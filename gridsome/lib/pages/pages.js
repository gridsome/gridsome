const path = require('path')
const fs = require('fs-extra')
const LRU = require('lru-cache')
const crypto = require('crypto')
const invariant = require('invariant')
const initWatcher = require('./watch')
const { Collection } = require('lokijs')
const { FSWatcher } = require('chokidar')
const { parseQuery } = require('../graphql')
const pathToRegexp = require('path-to-regexp')
const createPageQuery = require('./createPageQuery')
const { HookMap, SyncWaterfallHook, SyncBailHook } = require('tapable')
const { snakeCase, trimEnd } = require('lodash')
const validateInput = require('./schemas')

const TYPE_STATIC = 'static'
const TYPE_DYNAMIC = 'dynamic'
const isDev = process.env.NODE_ENV === 'development'

const createHash = value => crypto.createHash('md5').update(value).digest('hex')
const getRouteType = value => /:/.test(value) ? TYPE_DYNAMIC : TYPE_STATIC

class Pages {
  constructor (app) {
    this.app = app

    this.hooks = {
      parseComponent: new HookMap(() => new SyncBailHook(['source', 'resource'])),
      createRoute: new SyncWaterfallHook(['options']),
      createPage: new SyncWaterfallHook(['options']),
      pageContext: new SyncWaterfallHook(['context', 'data'])
    }

    this._componentCache = new LRU({ max: 100 })
    this._queryCache = new LRU({ max: 100 })
    this._watched = new Map()
    this._watcher = null

    this._routes = new Collection('routes', {
      indices: ['id', 'internal.priority'],
      unique: ['id', 'path'],
      disableMeta: true
    })

    this._pages = new Collection('pages', {
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
      .compoundsort([
        ['internal.priority', /* desc */ true],
        ['path', /* asc */ false]
      ])
      .data()
      .map(route => {
        return new Route(route, this)
      })
  }

  pages () {
    return this._pages.data.slice()
  }

  clearCache () {
    this._componentCache.reset()
    this._queryCache.reset()
  }

  clearComponentCache (component) {
    this._componentCache.del(component)
    this._queryCache.del(component)
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

    this.clearComponentCache(
      this.app.resolve(validated.component)
    )

    const options = this._createRouteOptions(validated, meta)
    const oldOptions = this._routes.by('id', options.id)
    const newOptions = Object.assign({}, options, {
      $loki: oldOptions.$loki,
      meta: oldOptions.meta
    })

    this._routes.update(newOptions)

    const route = new Route(newOptions, this)

    if (options.internal.query.source !== oldOptions.internal.query.source) {
      for (const page of route.pages()) {
        const vars = page.internal.queryVariables || page.context || {}
        const { paginate, variables, filters } = this._createPageQuery(route.internal.query, vars)

        const newOptions = { ...page }
        newOptions.internal.query = { paginate, variables, filters }

        this._pages.update(newOptions)
      }
    }

    return route
  }

  removeRoute (id) {
    const options = this._routes.by('id', id)

    this._pages.findAndRemove({ 'internal.route': id })
    this._routes.findAndRemove({ id })
    this._unwatchComponent(options.component)
  }

  createPage (input, meta = {}) {
    const options = validateInput('page', input)
    const type = getRouteType(options.path)

    const route = this.createRoute({
      type,
      path: options.path,
      component: options.component,
      name: options.route.name,
      meta: options.route.meta
    }, meta)

    return route.addPage({
      id: options.id,
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
      component: options.component,
      meta: options.route.meta
    }, meta)

    return route.updatePage({
      id: options.id,
      path: options.path,
      context: options.context,
      queryVariables: options.queryVariables
    })
  }

  removePage (id) {
    const page = this.getPage(id)
    if (!page) return
    const route = this.getRoute(page.internal.route)

    if (route.internal.isDynamic) {
      route.removePage(id)
    } else {
      this.removeRoute(route.id)
    }
  }

  removePageByPath (path) {
    const query = {
      path: trimEnd(path, '/') || '/'
    }

    this._pages
      .find(query)
      .forEach(page => this.removePage(page.id))
  }

  removePagesByComponent (path) {
    const component = this.app.resolve(path)

    this._routes
      .find({ component })
      .forEach(options => {
        this.removeRoute(options.id)
      })
  }

  findAndRemovePages (query) {
    this._pages.find(query).forEach(page => {
      this.removePage(page.id)
    })
  }

  findPages (query) {
    const matchingPages = this._pages.find(query)
    return matchingPages
  }

  findPage (query) {
    const [ matchingPage ] = this._pages.find(query)
    return matchingPage
  }

  getRoute (id) {
    const options = this._routes.by('id', id)
    return options ? new Route(options, this) : null
  }

  getRouteByPath (path) {
    const options = this._routes.by('path', path)
    return options ? new Route(options, this) : null
  }

  getMatch (path) {
    let route = this._routes.by('path', path)

    if (typeof route !== 'object') {
      const chain = this._routes.chain().simplesort('internal.priority', true)

      route = chain.data().find(route =>
        route.internal.regexp.test(path)
      )
    }

    if (typeof route !== 'object') {
      return { route: null, params: {} }
    }

    const { internal } = route
    const length = internal.keys.length
    const m = internal.regexp.exec(path)
    const params = {}

    for (let i = 0; i < length; i++) {
      const key = internal.keys[i]
      const param = m[i + 1]

      if (!param) continue

      params[key.name] = decodeURIComponent(param)

      if (key.repeat) {
        params[key.name] = params[key.name].split(key.delimiter)
      }
    }

    return {
      route: new Route(route, this),
      params
    }
  }

  getPage (id) {
    return this._pages.by('id', id)
  }

  _createRouteOptions (options, meta = {}) {
    const component = this.app.resolve(options.component)
    const { pageQuery } = this._parseComponent(component)
    const query = this._parseQuery(pageQuery, component)
    const { permalinks: { trailingSlash }} = this.app.config

    let path = options.path.replace(/\/+/g, '/')
    let name = options.name

    const type = options.type
    const prettyPath = trimEnd(path, '/') || '/'
    const hasTrailingSlash = /\/$/.test(options.path)
    const isDynamic = /:/.test(options.path)

    if (query.directives.paginate) {
      path = trimEnd(path, '/') + '/:page(\\d+)?' + (hasTrailingSlash ? '/' : '')
    }

    if (type === TYPE_STATIC && trailingSlash) {
      path = trimEnd(path, '/') + '/'
    } else if (type === TYPE_DYNAMIC) {
      path = trimEnd(path, '/') || '/'
      name = name || `__${snakeCase(path)}`
    }

    const keys = []
    const regexp = pathToRegexp(trimEnd(path, '/') || '/', keys)
    const id = options.id || createHash(`route-${prettyPath}`)
    const priority = this._resolvePriority(path)

    return this.hooks.createRoute.call({
      id,
      type,
      name,
      path,
      component,
      internal: Object.assign({}, meta, {
        meta: options.meta || {},
        path: prettyPath,
        isDynamic,
        priority,
        regexp,
        query,
        keys
      })
    })
  }

  _parseQuery (query, component) {
    if (this._queryCache.has(component)) {
      return this._queryCache.get(component)
    }

    const schema = this.app.schema.getSchema()
    const res = parseQuery(schema, query, component)

    this._queryCache.set(component, res)

    return res
  }

  _createPageQuery (parsedQuery, vars = {}) {
    return createPageQuery(parsedQuery, vars)
  }

  _createPageContext (page, queryVariables = {}) {
    const route = this.getRoute(page.internal.route)
    return this.hooks.pageContext.call({ ...page.context }, {
      pageQuery: route.internal.query.source,
      queryVariables
    })
  }

  _resolvePriority (path) {
    const segments = path.split('/').filter(Boolean)
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
    if (this._componentCache.has(component)) {
      return this._componentCache.get(component)
    }

    const ext = path.extname(component).substring(1)
    const hook = this.hooks.parseComponent.get(ext)
    let results = {}

    if (!fs.existsSync(component)) {
      throw new Error(`Could not find component ${component}.`)
    }

    if (hook) {
      const source = fs.readFileSync(component, 'utf8')
      results = hook.call(source, { resourcePath: component })
    }

    this._componentCache.set(component, validateInput('component', results || {}))

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

    this.createPath = pathToRegexp.compile(options.path)

    Object.defineProperty(this, '_factory', { value: factory })
    Object.defineProperty(this, '_pages', { value: factory._pages })
    Object.defineProperty(this, '_createPage', { value: factory.hooks.createPage })
  }

  pages () {
    return this._pages
      .chain()
      .simplesort('path', false)
      .find({ 'internal.route': this.id })
      .data()
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
    const options = this._createPageOptions(input)
    const oldOptions = this._pages.by('id', options.id)

    if (!oldOptions) {
      throw new Error(
        `Cannot update page "${options.path}". ` +
        `Existing page with id "${options.id}" could not be found.`
      )
    }

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
    const { permalinks: { trailingSlash }} = this._factory.app.config
    const { regexp, digest, isManaged, query } = this.internal
    const { id: _id, path: _path, context, queryVariables } = validateInput('routePage', input)

    let path = trimEnd(_path.replace(/\/+/g, '/'), '/') || '/'

    if (path[0] !== '/') path = '/' + path

    let publicPath = path

    const isDynamic = /:/.test(path)
    const id = _id || createHash(`page-${path}`)

    if (this.type === TYPE_STATIC) {
      if (trailingSlash) {
        publicPath = trimEnd(path, '/') + '/'
      }

      if (this.internal.path !== path) {
        invariant(
          regexp.test(path),
          `The path ${path} does not match ${regexp}`
        )
      }
    }

    if (this.type === TYPE_DYNAMIC) {
      invariant(
        this.internal.path === path,
        `Dynamic page must equal the route path: ${this.internal.path}`
      )
    }

    const vars = queryVariables || context || {}
    const { paginate, variables, filters } = this._factory._createPageQuery(query, vars)

    return this._createPage.call({
      id,
      path,
      publicPath,
      context,
      internal: {
        queryVariables,
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
