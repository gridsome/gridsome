const path = require('path')
const isUrl = require('is-url')
const crypto = require('crypto')
const moment = require('moment')
const autoBind = require('auto-bind')
const isRelative = require('is-relative')
const EventEmitter = require('eventemitter3')
const { ISO_8601_FORMAT, NODE_FIELDS } = require('../utils/constants')
const { cloneDeep, isString, isPlainObject, trim, omit, get } = require('lodash')
const createNodeOptions = require('./createNodeOptions')
const { warn } = require('../utils/log')
const { parseUrl, createFieldName } = require('./utils')

class ContentType {
  constructor (store, collection, options = {}) {
    this._collection = collection
    this._events = new EventEmitter()

    this.options = { refs: {}, fields: {}, ...options }
    this.typeName = options.typeName

    this._store = store
    this._transformers = store._transformers
    this._camelCasedFieldNames = options.camelCasedFieldNames || false
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

  get collection () {
    // TODO: warn when using collection directly
    return this._collection
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

    this.options.refs[this.createFieldName(fieldName)] = options
  }

  addSchemaField (fieldName, options) {
    this.options.fields[fieldName] = options
  }

  addNode (options) {
    options = this._store._app._hooks.node.call(options, this, this._store._app)

    const { nodeOptions, fields, belongsTo } = createNodeOptions(options, this)

    const { $uid, id } = nodeOptions
    const entry = { typeName: this.typeName, uid: $uid, id, belongsTo }
    const node = { ...fields, ...nodeOptions }

    // TODO: move this to a separate/internal plugin?
    if (typeof fields.path === 'string' || this.options.route) {
      node.path = this._createPath(node)
    }

    // add transformer to content type to let it
    // extend the node type when creating schema
    const { mimeTypes } = this.options
    const { mimeType } = node.internal
    if (mimeType && !mimeTypes.hasOwnProperty(mimeType)) {
      mimeTypes[mimeType] = this._transformers[mimeType]
    }

    try {
      this._collection.insert(node)
      this._store.store.index.insert(entry)
    } catch (err) {
      warn(`Failed to add node: ${err.message}`, this.typeName)
      return null
    }

    this._store.store.setUpdateTime()
    this._events.emit('add', node)

    return node
  }

  data () {
    return this._collection.find()
  }

  getNode (id) {
    const query = typeof id === 'string' ? { id } : id
    return this._collection.findOne(query)
  }

  findNode (query) {
    return this._collection.findOne(query)
  }

  findNodes (query) {
    return this._collection.find(query)
  }

  removeNode (id) {
    const query = typeof id === 'string' ? { id } : id
    const node = this._collection.findOne(query)

    this._store.store.index.findAndRemove({ uid: node.$uid })
    this._collection.findAndRemove({ $uid: node.$uid })
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

    const { $uid, id } = nodeOptions
    const oldNode = this.getNode($uid ? { $uid } : { id })

    if (!oldNode) {
      throw new Error(`Could not find node to update with id: ${id}`)
    }

    const oldOptions = cloneDeep(oldNode)
    const oldFields = omit(oldOptions, NODE_FIELDS)

    const node = { ...oldFields, ...fields, ...nodeOptions }

    node.$loki = oldNode.$loki
    node.id = nodeOptions.id || node.id

    // TODO: move this to a separate/internal plugin?
    if (typeof fields.path === 'string' || this.options.route) {
      node.path = this._createPath(node)
    }

    const entry = this._store.store.index.findOne({ uid: node.$uid })

    entry.belongsTo = belongsTo

    try {
      this._collection.update(node)
      this._store.store.index.update(entry)
    } catch (err) {
      warn(`Failed to update node: ${err.message}`, this.typeName)
      return null
    }

    this._store.store.setUpdateTime()
    this._events.emit('update', node, oldOptions)

    return node
  }

  _createPath (node) {
    if (!isString(this.options.route)) {
      return isString(node.path)
        ? '/' + trim(node.path, '/')
        : null
    }

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

      if (fieldName === 'id') params.id = node.id
      else if (fieldName === 'year' && !node.year) params.year = date.format('YYYY')
      else if (fieldName === 'month' && !node.month) params.month = date.format('MM')
      else if (fieldName === 'day' && !node.day) params.day = date.format('DD')
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

    return '/' + trim(this.options.createPath(params), '/')
  }

  //
  // utils
  //

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  createFieldName (name = '') {
    return createFieldName(name, this._camelCasedFieldNames)
  }

  //
  // deprecated
  //

  slugify (string = '') {
    return this._store.slugify(string)
  }
}

module.exports = ContentType
