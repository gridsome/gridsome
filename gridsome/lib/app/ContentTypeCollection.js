const path = require('path')
const isUrl = require('is-url')
const crypto = require('crypto')
const moment = require('moment')
const autoBind = require('auto-bind')
const EventEmitter = require('events')
const { warn } = require('../utils/log')
const isRelative = require('is-relative')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { cloneDeep, isPlainObject, get } = require('lodash')
const { slugify } = require('../utils')

const normalize = require('./store/normalize')
const processFields = require('./store/processFields')
const { parseUrl } = require('./store/utils')

class ContentTypeCollection extends EventEmitter {
  constructor (store, collection, options = {}) {
    super()

    this.collection = collection

    this.options = { refs: {}, fields: {}, ...options }
    this.typeName = options.typeName
    this.description = options.description

    this._store = store
    this._transformers = store._transformers
    this._resolveAbsolutePaths = options.resolveAbsolutePaths || false
    this._assetsContext = typeof options.resolveAbsolutePaths === 'string'
      ? isUrl(options.resolveAbsolutePaths)
        ? parseUrl(options.resolveAbsolutePaths).fullUrl
        : isRelative(options.resolveAbsolutePaths)
          ? path.resolve(store.context, options.resolveAbsolutePaths)
          : options.resolveAbsolutePaths
      : store.context

    autoBind(this)
  }

  addReference (fieldName, options) {
    if (typeof options === 'string') {
      options = { typeName: options }
    }

    this.options.refs[fieldName] = options
  }

  addSchemaField (fieldName, options) {
    this.options.fields[fieldName] = options
  }

  addNode (options) {
    const { nodeOptions, customFields } = normalize(options, this)

    const { fields, belongsTo } = processFields(customFields, this.options.refs, {
      origin: nodeOptions.internal.origin,
      context: this._assetsContext,
      resolveAbsolute: this._resolveAbsolutePaths
    })

    const { typeName, uid, id } = nodeOptions

    const entry = { type: 'node', typeName, uid, id, belongsTo }
    const node = { ...fields, ...nodeOptions }

    if (!node.date) node.date = new Date().toISOString()

    // TODO: remove before 1.0
    if (!node.slug) node.slug = this.slugify(node.title)

    node.withPath = typeof node.path === 'string'
    node.path = entry.path = typeof nodeOptions.path === 'string'
      ? '/' + nodeOptions.path.replace(/^\/+/g, '')
      : this._createPath(node)

    // add transformer to content type to let it
    // extend the node type when creating schema
    const { mimeTypes } = this.options
    const { mimeType } = node.internal
    if (mimeType && !mimeTypes.hasOwnProperty(mimeType)) {
      mimeTypes[mimeType] = this._transformers[mimeType]
    }

    try {
      this._store.store.index.insert(entry)
    } catch (err) {
      warn(`Skipping duplicate path for ${node.path}`, this.typeName)
      return null
    }

    this.collection.insert(node)
    this.emit('change', node)

    return node
  }

  getNode (id) {
    const query = typeof id === 'string' ? { id } : id
    return this.collection.findOne(query)
  }

  removeNode (id) {
    const query = typeof id === 'string' ? { id } : id
    const node = this.collection.findOne(query)

    this._store.store.index.findAndRemove({ uid: node.uid })
    this.collection.findAndRemove({ uid: node.uid })

    this.emit('change', undefined, node)
  }

  updateNode (options = {}, _options = {}) {
    // TODO: remove before 1.0
    if (typeof options === 'string') {
      _options.id = options
      options = _options
    }

    const { nodeOptions, customFields } = normalize(options, this)

    const { fields, belongsTo } = processFields(customFields, this.options.refs, {
      origin: nodeOptions.internal.origin,
      context: this._assetsContext,
      resolveAbsolute: this._resolveAbsolutePaths
    })

    const { uid, id } = nodeOptions
    const node = this.getNode(uid ? { uid } : { id })

    if (!node) {
      throw new Error(`Could not find node to update with id: ${id}`)
    }

    const oldNode = cloneDeep(node)

    if (id) node.id = id || node.id
    if (nodeOptions.title) node.title = nodeOptions.title
    if (nodeOptions.date) node.date = nodeOptions.date

    Object.assign(node, fields)
    Object.assign(node.internal, nodeOptions.internal)

    // TODO: remove before 1.0
    // the remark transformer uses node.content
    if (options.content) node.content = options.content
    if (options.excerpt) node.excerpt = options.excerpt
    if (options.slug) node.slug = options.slug

    // TODO: remove before 1.0
    if (node.slug && !options.slug) node.slug = this.slugify(node.title)

    node.path = typeof nodeOptions.path === 'string'
      ? '/' + nodeOptions.path.replace(/^\/+/g, '')
      : this._createPath(node)

    const indexEntry = this._store.store.index.findOne({ uid: node.uid })

    indexEntry.path = node.path
    indexEntry.belongsTo = belongsTo

    this.collection.update(node)
    this._store.store.index.update(indexEntry)
    this.emit('change', node, oldNode)

    return node
  }

  _createPath (node) {
    const date = moment.utc(node.date, ISO_8601_FORMAT, true)
    const { routeKeys } = this.options
    const length = routeKeys.length
    const params = {}

    // Param values are slugified but the original
    // value will be available with '_raw' suffix.
    for (let i = 0; i < length; i++) {
      const { name, fieldName, repeat, suffix } = routeKeys[i]
      let { path } = routeKeys[i]

      // TODO: remove before 1.0
      // let slug fallback to title
      if (name === 'slug' && !node.slug) {
        path = ['title']
      }

      const field = get(node, path, fieldName)

      if (fieldName === 'year') params.year = date.format('YYYY')
      else if (fieldName === 'month') params.month = date.format('MM')
      else if (fieldName === 'day') params.day = date.format('DD')
      else {
        const repeated = repeat && Array.isArray(field)
        const values = repeated ? field : [field]

        const segments = values.map(value => {
          if (
            isPlainObject(value) &&
            value.hasOwnProperty('typeName') &&
            value.hasOwnProperty('id') &&
            !Array.isArray(value.id)
          ) {
            return String(value.id)
          } else if (!isPlainObject(value)) {
            return suffix === 'raw'
              ? String(value)
              : this.slugify(String(value))
          } else {
            return ''
          }
        }).filter(Boolean)

        params[name] = repeated ? segments : segments[0]
      }
    }

    return this.options.createPath(params)
  }

  //
  // utils
  //

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  slugify (string = '') {
    return slugify(string)
  }
}

module.exports = ContentTypeCollection
