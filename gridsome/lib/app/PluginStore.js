const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const autoBind = require('auto-bind')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const pathToRegexp = require('path-to-regexp')
const slugify = require('@sindresorhus/slugify')
const parsePageQuery = require('../graphql/parsePageQuery')
const { mapValues, cloneDeep } = require('lodash')
const { cache, nodeCache } = require('../utils/cache')

class Source extends EventEmitter {
  constructor (app, options, { transformers }) {
    super()
    autoBind(this)

    this._app = app
    this._typeName = options.typeName
    this._resolveAbsolutePaths = options.resolveAbsolutePaths || false
    this._transformers = mapValues(transformers || app.config.transformers, transformer => {
      return new transformer.TransformerClass(transformer.options, {
        localOptions: options[transformer.name] || {},
        resolveNodeFilePath: this.resolveNodeFilePath,
        context: app.context,
        queue: app.queue,
        cache,
        nodeCache
      })
    })

    this.context = app.context
    this.store = app.store
    this.mime = mime
  }

  // nodes

  addType (...args) {
    console.log('!! store.addType is deprectaded, use store.addContentType instead.')
    return this.addContentType(...args)
  }

  addContentType (options) {
    if (!options.typeName) {
      throw new Error(`«typeName» option is required.`)
    }

    if (this.store.collections.hasOwnProperty(options.typeName)) {
      return this.store.getContentType(options.typeName)
    }

    let makePath = () => null
    let routeKeys = []

    if (typeof options.route === 'string') {
      makePath = pathToRegexp.compile(options.route)
      pathToRegexp(options.route, routeKeys)
    }

    // normalize references
    const refs = mapValues(options.refs, (ref, key) => ({
      fieldName: key,
      key: ref.key || 'id',
      typeName: ref.typeName || options.typeName,
      description: Array.isArray(ref.typeName)
        ? `Reference to ${ref.typeName.join(', ')}`
        : `Reference to ${ref.typeName}`
    }))

    if (typeof options.resolveAbsolutePaths === 'undefined') {
      options.resolveAbsolutePaths = this._resolveAbsolutePaths
    }

    return this.store.addContentType(this, {
      route: options.route,
      fields: options.fields || {},
      typeName: options.typeName,
      routeKeys: routeKeys.map(key => key.name.replace('_raw', '')),
      resolveAbsolutePaths: options.resolveAbsolutePaths,
      mimeTypes: [],
      belongsTo: {},
      makePath,
      refs
    }).on('change', (node, oldNode) => {
      this.emit('change', node, oldNode)
    })
  }

  getContentType (type) {
    return this.store.getContentType(type)
  }

  // pages

  addPage (type, options) {
    const page = {
      id: options.id || options._id,
      type: type || 'page',
      component: options.component,
      internal: this.createInternals(options.internal)
    }

    // TODO: remove before 1.0
    page._id = page.id

    try {
      page.pageQuery = parsePageQuery(options.pageQuery || {})
    } catch (err) {}

    page.title = options.title || page._id
    page.slug = options.slug || this.slugify(page.title)
    page.path = options.path || `/${page.slug}`
    page.file = options.file

    this.emit('addPage', page)

    return this.store.addPage(page)
  }

  updatePage (id, options) {
    const page = this.getPage(id)
    const oldPage = cloneDeep(page)
    const internal = this.createInternals(options.internal)

    try {
      page.pageQuery = options.pageQuery
        ? parsePageQuery(options.pageQuery)
        : page.pageQuery
    } catch (err) {}

    page.title = options.title || page.title
    page.slug = options.slug || page.slug
    page.path = options.path || `/${page.slug}`
    page.file = options.file || page.file
    page.internal = Object.assign({}, page.internal, internal)

    this.emit('updatePage', page, oldPage)

    return page
  }

  removePage (_id) {
    this.store.removePage(_id)
    this.emit('removePage', _id)
  }

  getPage (_id) {
    return this.store.getPage(_id)
  }

  // misc

  createInternals (options = {}) {
    return {
      origin: options.origin,
      mimeType: options.mimeType,
      content: options.content,
      timestamp: Date.now()
    }
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  makeTypeName (name = '') {
    if (!this._typeName) {
      throw new Error(`Missing typeName option.`)
    }

    return camelCase(`${this._typeName} ${name}`, { pascalCase: true })
  }

  slugify (string = '') {
    return slugify(string, { separator: '-' })
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }

  resolveNodeFilePath (node, toPath) {
    const { collection } = this.getContentType(node.typeName)

    return this._app.resolveFilePath(
      node.internal.origin,
      toPath,
      collection.resolveAbsolutePaths
    )
  }
}

module.exports = Source
