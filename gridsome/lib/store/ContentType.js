const path = require('path')
const isUrl = require('is-url')
const crypto = require('crypto')
const autoBind = require('auto-bind')
const isRelative = require('is-relative')
const EventEmitter = require('eventemitter3')
const normalizeNodeOptions = require('./normalizeNodeOptions')
const { parseUrl, createFieldName } = require('./utils')
const { warn } = require('../utils/log')
const { mapValues } = require('lodash')
const { Collection } = require('lokijs')

class ContentType {
  constructor (typeName, options, store) {
    this.typeName = typeName
    this.options = options || {}

    this._store = store
    this._transformers = store._transformers
    this._events = new EventEmitter()
    this._collection = new Collection(typeName, {
      indices: ['id', 'path', 'internal.typeName'],
      unique: ['id', 'path'],
      disableMeta: true
    })

    this._refs = mapValues(options.refs, (ref, key) => ({
      typeName: ref.typeName || options.typeName,
      fieldName: key
    }))

    this._mimeTypes = {}
    this._fields = options.fields || {}
    this._dateField = options.dateField || 'date'
    this._defaultSortBy = this._dateField
    this._defaultSortOrder = 'DESC'

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

    this._refs[this.createFieldName(fieldName)] = options
  }

  addSchemaField (fieldName, options) {
    this._fields[fieldName] = options
  }

  addNode (options) {
    options = normalizeNodeOptions(options, this, true)

    const node = this._store.store.hooks.addNode.call(options, this)

    if (!node) return null

    try {
      this._collection.insert(node)
    } catch (err) {
      warn(`Failed to add node: ${err.message}`, this.typeName)
      return null
    }

    this._events.emit('add', node)

    return node
  }

  data () {
    return this._collection.find()
  }

  getNode (id) {
    return this._collection.findOne(
      typeof id === 'string' ? { id } : id
    )
  }

  findNode (query) {
    return this._collection.findOne(query)
  }

  findNodes (query) {
    return this._collection.find(query)
  }

  removeNode (id) {
    const node = this._collection.findOne(
      typeof id === 'string' ? { id } : id
    )

    this._collection.findAndRemove({ $uid: node.$uid })
    this._events.emit('remove', node)

    return null
  }

  updateNode (options = {}) {
    options = normalizeNodeOptions(options, this, true)

    const oldNode = this.getNode(options.$uid
      ? { $uid: options.$uid }
      : { id: options.id }
    )

    if (!oldNode) {
      throw new Error(`Could not find node to update with id: ${options.id}`)
    }

    const node = this._store.store.hooks.addNode.call(options, this)

    if (!node) {
      return this.removeNode(oldNode.id)
    }

    node.id = options.id || oldNode.id
    node.$loki = oldNode.$loki

    try {
      this._collection.update(node)
    } catch (err) {
      warn(`Failed to update node: ${err.message}`, this.typeName)
      return null
    }

    this._events.emit('update', node, oldNode)

    return node
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
