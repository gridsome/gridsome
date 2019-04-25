const path = require('path')
const isUrl = require('is-url')
const crypto = require('crypto')
const moment = require('moment')
const autoBind = require('auto-bind')
const { warn } = require('../utils/log')
const isRelative = require('is-relative')
const EventEmitter = require('eventemitter3')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { cloneDeep, trimEnd, isPlainObject, omit, get } = require('lodash')
const createNodeOptions = require('./store/createNodeOptions')
const { NODE_FIELDS } = require('../utils/constants')
const { parseUrl } = require('./store/utils')

class ContentTypeCollection {
  constructor (store, collection, options = {}) {
    this.collection = collection
    this._events = new EventEmitter()

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

  on (eventName, fn, ctx) {
    return this._events.on(eventName, fn, ctx)
  }

  off (eventName, fn, ctx) {
    return this._events.removeListener(eventName, fn, ctx)
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
    const { nodeOptions, fields, belongsTo } = createNodeOptions(options, this)

    const { uid, id } = nodeOptions
    const entry = { type: 'node', typeName: this.typeName, uid, id, belongsTo }
    const node = { ...fields, ...nodeOptions }

    node.typeName = this.typeName

    if (!node[this.options.dateField]) {
      node[this.options.dateField] = new Date().toISOString()
    }

    // TODO: move this to a separate/internal plugin?
    node.__withPath = typeof fields.path === 'string'
    node.path = entry.path = node.__withPath
      ? trimEnd('/' + fields.path.replace(/^\/+/g, ''), '/')
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
    this._store.store.setUpdateTime()
    this._events.emit('add', node)

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
    this._store.store.setUpdateTime()

    this._events.emit('remove', node)
  }

  updateNode (options = {}, _options = {}) {
    // TODO: remove before 1.0
    if (typeof options === 'string') {
      _options.id = options
      options = _options
    }

    const { nodeOptions, fields, belongsTo } = createNodeOptions(options, this)

    const { uid, id } = nodeOptions
    const oldNode = this.getNode(uid ? { uid } : { id })

    if (!oldNode) {
      throw new Error(`Could not find node to update with id: ${id}`)
    }

    const oldOptions = cloneDeep(oldNode)
    const oldFields = omit(oldOptions, NODE_FIELDS)

    const node = { ...oldFields, ...fields, ...nodeOptions }

    node.$loki = oldNode.$loki
    node.id = nodeOptions.id || node.id
    node.typeName = this.typeName

    // TODO: move this to a separate/internal plugin?
    node.__withPath = typeof fields.path === 'string'
    node.path = node.__withPath
      ? trimEnd('/' + fields.path.replace(/^\/+/g, ''), '/')
      : this._createPath(node)

    const indexEntry = this._store.store.index.findOne({ uid: node.uid })

    indexEntry.path = node.path
    indexEntry.belongsTo = belongsTo

    this.collection.update(node)
    this._store.store.index.update(indexEntry)
    this._store.store.setUpdateTime()
    this._events.emit('update', node, oldNode)

    return node
  }

  _createPath (node) {
    const { routeKeys, dateField } = this.options
    const date = moment.utc(node[dateField], ISO_8601_FORMAT, true)
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
    return this._store.slugify(string)
  }
}

module.exports = ContentTypeCollection
