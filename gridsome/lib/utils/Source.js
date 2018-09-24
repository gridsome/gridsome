const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const pathToRegexp = require('path-to-regexp')
const slugify = require('@sindresorhus/slugify')
const parsePageQuery = require('../graphql/parsePageQuery')
const { mapValues, mapKeys, cloneDeep } = require('lodash')

class Source extends EventEmitter {
  constructor (options, { context, store, transformers = {}}) {
    super()

    this.typeName = options.typeName
    this.context = context
    this.store = store
    this.transformers = transformers
    this.ownTypeNames = []
    this.mime = mime
  }

  // nodes

  addType (type, options = {}) {
    const typeName = this.makeTypeName(type)

    // function for generating paths from routes for this type
    const makePath = options.route
      ? pathToRegexp.compile(options.route)
      : () => null

    // normalize references
    const refs = mapValues(options.refs, ref => ({
      type: ref.type,
      key: ref.key || '_id',
      description: `Reference to ${ref.type}`,
      typeName: this.makeTypeName(ref.type),
      schemaType: Array.isArray(ref.type)
        ? ref.type.map(type => this.makeTypeName(type))
        : this.makeTypeName(ref.type)
    }))

    this.ownTypeNames.push(typeName)

    this.store.addType(typeName, {
      name: typeName,
      route: options.route,
      fields: options.fields || {},
      mimeTypes: [],
      belongsTo: {},
      makePath,
      type,
      refs
    })

    return this.store.types[typeName]
  }

  getType (type) {
    return this.store.getType(type)
  }

  addNode (type, options) {
    const node = this.createNode(type, options)

    // add transformer to content type to let it
    // extend the node type when creating schema
    const { mimeType } = node.internal
    const mimeTypes = this.store.types[node.typeName].mimeTypes
    if (mimeType && !mimeTypes.hasOwnProperty(mimeType)) {
      mimeTypes[mimeType] = this.transformers[mimeType]
    }

    this.store.addNode(node.typeName, node)
    this.emit('change', node)

    return node
  }

  getNode (type, id) {
    const typeName = this.makeTypeName(type)
    return this.store.getNode(typeName, id)
  }

  updateNode (type, id, options) {
    const node = this.getNode(type, id)
    const oldNode = cloneDeep(node)
    const fields = mapKeys(options.fields, (v, key) => camelCase(key))
    const internal = this.createInternals(options.internal)

    node.title = options.title || fields.title || node.title
    node.date = options.date || fields.date || node.date
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.fields = Object.assign({}, node.fields, fields)
    node.refs = Object.assign({}, node.refs, options.refs || {})
    node.internal = Object.assign({}, node.internal, internal)
    node.path = options.path || this.makePath(node)

    this.emit('change', node, oldNode)

    return node
  }

  removeNode (type, id) {
    const typeName = this.makeTypeName(type)
    const oldNode = this.store.getNode(typeName, id)

    this.store.removeNode(typeName, id)
    this.emit('change', undefined, oldNode)
  }

  createNode (type, options) {
    const typeName = this.makeTypeName(type)
    const internal = this.createInternals(options.internal)
    // all field names must be camelCased in order to work in GraphQL
    const fields = mapKeys(options.fields, (v, key) => camelCase(key))
    const _id = options._id || this.makeUid(JSON.stringify(options))

    const node = {
      _id,
      type,
      fields,
      typeName,
      internal,
      refs: options.refs || {},
      withPath: !!options.path
    }

    node.title = options.title || fields.title || options._id
    node.date = options.date || fields.date || new Date().toISOString()
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.path = options.path || this.makePath(node)

    return node
  }

  // pages

  addPage (type, options) {
    const page = {
      _id: options._id,
      type: type || 'page',
      component: options.component,
      internal: this.createInternals({ type })
    }

    try {
      page.pageQuery = parsePageQuery(options.pageQuery || {})
    } catch (err) {}

    page.title = options.title || page._id
    page.slug = options.slug || this.slugify(page.title)
    page.path = options.path || `/${page.slug}`

    this.emit('addPage', page)

    return this.store.addPage(page)
  }

  updatePage (id, options) {
    const page = this.getPage(id)
    const oldPage = cloneDeep(page)

    try {
      page.pageQuery = options.pageQuery
        ? parsePageQuery(options.pageQuery)
        : page.pageQuery
    } catch (err) {}

    page.title = options.title || page.title
    page.slug = options.slug || page.slug
    page.path = options.path || `/${page.slug}`

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

  makePath ({ typeName, type, date, slug }) {
    const year = date ? dateFormat(date, 'yyyy') : null
    const month = date ? dateFormat(date, 'mm') : null
    const day = date ? dateFormat(date, 'dd') : null
    const params = { year, month, day, type, slug }

    // TODO: make custom fields available as route params

    return this.store.types[typeName].makePath(params)
  }

  transform (mimeType, content, options) {
    const transformer = this.transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    return transformer.parse(content, options)
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
