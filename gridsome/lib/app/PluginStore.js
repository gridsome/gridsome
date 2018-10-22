const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const pathToRegexp = require('path-to-regexp')
const slugify = require('@sindresorhus/slugify')
const parsePageQuery = require('../graphql/parsePageQuery')
const { mapValues, cloneDeep } = require('lodash')

class Source extends EventEmitter {
  constructor (app, api) {
    super()

    this.typeName = api.options.typeName
    this.transformers = api.transformers
    this.context = app.context
    this.store = app.store
    this.mime = mime
  }

  // nodes

  addType (...args) {
    console.log('!! store.addType is deprectaded, use store.addContentType instead.')
    return this.addContentType(...args)
  }

  addContentType (type, options = {}) {
    const typeName = typeof type === 'string'
      ? this.makeTypeName(type)
      : type.typeName

    options = type
    type = typeName

    if (this.store.collections.hasOwnProperty(typeName)) {
      return this.store.getContentType(typeName)
    }

    // function for generating paths from routes for this type
    const makePath = options.route
      ? pathToRegexp.compile(options.route)
      : () => null

    // normalize references
    const refs = mapValues(options.refs, (ref, key) => ({
      fieldName: key,
      key: ref.key || '_id',
      description: `Reference to ${ref.typeName}`,
      typeName: ref.typeName || typeName
    }))

    return this.store.addContentType(this, {
      route: options.route,
      fields: options.fields || {},
      mimeTypes: [],
      belongsTo: {},
      typeName,
      makePath,
      type,
      refs
    })
  }

  getContentType (type) {
    return this.store.getContentType(type)
  }

  // pages

  addPage (type, options) {
    const page = {
      _id: options._id,
      type: type || 'page',
      component: options.component,
      internal: this.createInternals(options.internal)
    }

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
    if (!this.typeName) {
      throw new Error(`Missing typeName option.`)
    }

    return camelCase(`${this.typeName} ${name}`, { pascalCase: true })
  }

  slugify (string = '') {
    return slugify(string, { separator: '-' })
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }
}

module.exports = Source
