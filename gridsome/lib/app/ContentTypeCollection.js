const hash = require('hash-sum')
const moment = require('moment')
const autoBind = require('auto-bind')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const { warn } = require('../utils/log')
const { isRefField } = require('../graphql/utils')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { cloneDeep, isPlainObject, isDate, get } = require('lodash')
const { isResolvablePath, slugify, safeKey } = require('../utils')

const nonValidCharsRE = new RegExp('[^a-zA-Z0-9_]', 'g')
const leadingNumberRE = new RegExp('^([0-9])')

class ContentTypeCollection extends EventEmitter {
  constructor (store, pluginStore, options) {
    super()

    this.baseStore = store
    this.pluginStore = pluginStore

    this.options = { refs: {}, fields: {}, ...options }
    this.typeName = options.typeName
    this.description = options.description
    this.resolveAbsolutePaths = options.resolveAbsolutePaths || false

    this.collection = store.data.addCollection(options.typeName, {
      indices: ['id', 'path', 'date'],
      unique: ['id', 'path'],
      autoupdate: true
    })

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
    const { typeName } = this.options
    const internal = this.pluginStore._createInternals(options.internal)

    // prioritize node.id over node.fields.id
    if (options.id && options.fields && options.fields.id) {
      delete options.fields.id
    }

    // transform content with transformer for given mime type
    if (internal.content && internal.mimeType) {
      this._transformNodeOptions(options, internal)
    }

    const { fields, belongsTo } = this._processNodeFields(options.fields, internal.origin)

    const id = fields.id || options.id || options._id || hash(options)
    const node = { id, typeName, internal }

    // TODO: remove before 1.0
    node._id = id

    node.uid = options.uid || this.makeUid(typeName + node.id)
    node.title = options.title || fields.title || node.id
    node.date = options.date || fields.date || new Date().toISOString()
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.content = options.content || fields.content || ''
    node.excerpt = options.excerpt || fields.excerpt || ''
    node.withPath = typeof options.path === 'string'

    node.fields = fields
    node.path = typeof options.path === 'string'
      ? '/' + options.path.replace(/^\/+/g, '')
      : this._createPath(node)

    // add transformer to content type to let it
    // extend the node type when creating schema
    const { mimeTypes } = this.options
    const { mimeType } = node.internal
    if (mimeType && !mimeTypes.hasOwnProperty(mimeType)) {
      mimeTypes[mimeType] = this.pluginStore._transformers[mimeType]
    }

    try {
      this.baseStore.index.insert({
        type: 'node',
        path: node.path,
        typeName: node.typeName,
        uid: node.uid,
        id: node.id,
        belongsTo,
        _id: node.id // TODO: remove this before v1.0
      })
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

    this.baseStore.index.findAndRemove({ uid: node.uid })
    this.collection.findAndRemove({ uid: node.uid })

    this.emit('change', undefined, node)
  }

  updateNode (options = {}, _options = {}) {
    // TODO: remove before 1.0
    if (typeof options === 'string') {
      _options.id = options
      options = _options
    }

    const internal = this.pluginStore._createInternals(options.internal)

    // prioritize node.id over node.fields.id
    if (options.id && options.fields && options.fields.id) {
      delete options.fields.id
    }

    // transform content with transformer for given mime type
    if (internal.content && internal.mimeType) {
      this._transformNodeOptions(options, internal)
    }

    const { fields, belongsTo } = this._processNodeFields(options.fields, internal.origin)
    const id = fields.id || options.id || options._id
    const query = options.uid ? { uid: options.uid } : { id }

    const node = this.getNode(query)

    if (!node) {
      throw new Error(`Could not find node to update with id: ${id}`)
    }

    const oldNode = cloneDeep(node)

    Object.assign(node.internal, this.pluginStore._createInternals(options.internal))

    node.id = id || node.id
    node.title = options.title || fields.title || node.title
    node.date = options.date || fields.date || node.date
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.content = options.content || fields.content || node.content
    node.excerpt = options.excerpt || fields.excerpt || node.excerpt
    node.internal = Object.assign({}, node.internal, internal)

    node.fields = fields
    node.path = typeof options.path === 'string'
      ? '/' + options.path.replace(/^\/+/g, '')
      : this._createPath(node)

    const indexEntry = this.baseStore.index.findOne({ uid: node.uid })

    indexEntry.path = node.path
    indexEntry.belongsTo = belongsTo

    this.emit('change', node, oldNode)

    return node
  }

  _transformNodeOptions (options, internal) {
    const { mimeType, content } = internal
    const transformer = this.pluginStore._transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    const result = transformer.parse(content)

    if (result.id) options.id = result.id
    if (result.title) options.title = result.title
    if (result.slug) options.slug = result.slug
    if (result.path) options.path = result.path
    if (result.date) options.date = result.date
    if (result.content) options.content = result.content
    if (result.excerpt) options.excerpt = result.excerpt

    if (result.fields) {
      options.fields = Object.assign(options.fields || {}, result.fields)
    }
  }

  _processNodeFields (input = {}, origin = '') {
    const belongsTo = {}

    const addBelongsTo = ({ typeName, id }) => {
      belongsTo[typeName] = belongsTo[typeName] || {}
      if (Array.isArray(id)) {
        id.forEach(id => {
          belongsTo[typeName][safeKey(id)] = true
        })
      } else {
        belongsTo[typeName][safeKey(id)] = true
      }
    }

    const processField = field => {
      if (field === undefined) return field
      if (field === null) return field

      switch (typeof field) {
        case 'object':
          if (isDate(field)) {
            return field
          }
          if (isRefField(field)) {
            if (Array.isArray(field.typeName)) {
              field.typeName.forEach(typeName => {
                addBelongsTo({ typeName, id: field.id })
              })
            } else {
              addBelongsTo(field)
            }
          }
          return processFields(field)
        case 'string':
          return isResolvablePath(field)
            ? this.pluginStore._app.resolveFilePath(
              origin,
              field,
              this.resolveAbsolutePaths
            )
            : field
      }

      return field
    }

    const createKey = key => {
      key = key.replace(nonValidCharsRE, '_')
      key = camelCase(key)
      key = key.replace(leadingNumberRE, '_$1')

      return key
    }

    const processFields = fields => {
      const res = {}

      for (const key in fields) {
        if (key.startsWith('__')) {
          // don't touch keys which starts with __ because they are
          // meant for internal use and will not be part of the schema
          res[key] = fields[key]
          continue
        }

        res[createKey(key)] = Array.isArray(fields[key])
          ? fields[key].map(value => processField(value))
          : processField(fields[key])
      }

      return res
    }

    const fields = processFields(input)

    // TODO: this should be removed before 1.0
    for (const fieldName in this.options.refs) {
      const id = fields[fieldName]
      const { typeName } = this.options.refs[fieldName]
      addBelongsTo({ id, typeName })
    }

    return { fields, belongsTo }
  }

  _createPath (node) {
    const date = moment.utc(node.date, ISO_8601_FORMAT, true)
    const { routeKeys } = this.options
    const length = routeKeys.length
    const params = {}

    // Param values are slugified but the original
    // value will be available with '_raw' suffix.
    for (let i = 0; i < length; i++) {
      const { name, path, fieldName, repeat, suffix } = routeKeys[i]
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

  makeUid (value) {
    return this.pluginStore.makeUid(value)
  }

  slugify (string = '') {
    return slugify(string)
  }
}

module.exports = ContentTypeCollection
