const moment = require('moment')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const EventEmitter = require('events')
const { warn } = require('../utils/log')
const { isRefField } = require('../graphql/utils')
const { ISO_8601_FORMAT } = require('../utils/constants')
const { cloneDeep, isDate, isPlainObject, get } = require('lodash')
const { isResolvablePath, safeKey, slugify } = require('../utils')

const normalize = require('./store/normalize')
const transform = require('./store/transform')

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
      indices: ['id', 'path'],
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
    options = normalize(options, this.typeName)
    options = transform(options, this.pluginStore._transformers)

    const { fields, belongsTo } = this._normalizeFields(options)
    const { typeName, uid, id } = options

    const entry = { type: 'node', typeName, uid, id, belongsTo }
    const node = { ...options, fields }

    if (!node.date) node.date = new Date().toISOString()

    // TODO: remove before 1.0
    node.slug = fields.slug || this.slugify(node.title)

    node.withPath = typeof node.path === 'string'
    node.path = entry.path = typeof options.path === 'string'
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
      this.baseStore.index.insert(entry)
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

    options = normalize(options, this.typeName)
    options = transform(options, this.pluginStore._transformers)

    const { fields, belongsTo } = this._normalizeFields(options)
    const { uid, id } = options

    const node = this.getNode(uid ? { uid } : { id })

    if (!node) {
      throw new Error(`Could not find node to update with id: ${id}`)
    }

    const oldNode = cloneDeep(node)

    if (id) node.id = id || node.id
    if (options.title) node.title = options.title
    if (options.date) node.date = options.date

    node.fields = fields

    Object.assign(node.internal, options.internal)

    // TODO: remove before 1.0
    // the remark transformer uses node.content
    if (options.content) node.content = options.content
    if (options.excerpt) node.excerpt = options.excerpt
    if (options.slug) node.slug = options.slug

    // TODO: remove before 1.0
    node.slug = fields.slug || this.slugify(node.title)

    node.path = typeof options.path === 'string'
      ? '/' + options.path.replace(/^\/+/g, '')
      : this._createPath(node)

    const indexEntry = this.baseStore.index.findOne({ uid: node.uid })

    indexEntry.path = node.path
    indexEntry.belongsTo = belongsTo

    this.emit('change', node, oldNode)

    return node
  }

  _normalizeFields ({ fields: input, internal: { origin = '' }}) {
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

    // references add by collection.addReference()
    for (const fieldName in this.options.refs) {
      const { typeName } = this.options.refs[fieldName]
      const id = fields[fieldName]

      if (id) addBelongsTo({ id, typeName })
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
      const { name, fieldName, repeat, suffix } = routeKeys[i]
      let { path } = routeKeys[i]

      // TODO: remove before 1.0
      // let slug fallback to title
      if (name === 'slug' && !node.fields.slug) {
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

  makeUid (value) {
    return this.pluginStore.makeUid(value)
  }

  slugify (string = '') {
    return slugify(string)
  }
}

module.exports = ContentTypeCollection
