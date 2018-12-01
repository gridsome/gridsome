const path = require('path')
const crypto = require('crypto')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const slugify = require('@sindresorhus/slugify')
const { cloneDeep } = require('lodash')
const { warn } = require('../utils/log')

const nonValidCharsRE = new RegExp('[^a-zA-Z0-9_]', 'g')
const leadingNumberRE = new RegExp('^([0-9])')

class ContentTypeCollection extends EventEmitter {
  constructor (store, pluginStore, options) {
    super()

    this._store = store
    this._pluginStore = pluginStore

    this.options = { refs: {}, fields: {}, ...options }
    this.typeName = options.typeName
    this.description = options.description
    this.resolveAbsolutePaths = options.resolveAbsolutePaths || false
    this.collection = store.data.addCollection(options.typeName, {
      unique: ['id', 'path'],
      indices: ['date'],
      autoupdate: true
    })
  }

  addReference (fieldName, options) {
    this.options.refs[camelCase(fieldName)] = options
  }

  addSchemaField (fieldName, options) {
    this.options.fields[camelCase(fieldName)] = options
  }

  addNode (options) {
    const node = this.createNode(options)

    // add transformer to content type to let it
    // extend the node type when creating schema
    const { mimeTypes } = this.options
    const { mimeType } = node.internal
    if (mimeType && !mimeTypes.hasOwnProperty(mimeType)) {
      mimeTypes[mimeType] = this._pluginStore._transformers[mimeType]
    }

    try {
      this.collection.insert(node)
      this.emit('change', node)
    } catch (err) {
      warn(`Skipping duplicate path for ${node.path}`, this.typeName)
    }

    return node
  }

  getNode (id) {
    return this.collection.findOne({ id })
  }

  updateNode (id, options) {
    const node = this.getNode(id)
    const oldNode = cloneDeep(node)
    const internal = this.createInternals(options.internal)

    // transform content with transformer for given mime type
    if (internal.content && internal.mimeType) {
      this.transformNodeOptions(options, internal)
    }

    const { fields = {}} = options

    node.title = options.title || fields.title || node.title
    node.date = options.date || fields.date || node.date
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.internal = Object.assign({}, node.internal, internal)
    node.path = options.path || this.makePath(node)

    node.fields = this.processNodeFields(fields, node.internal.origin)

    this.emit('change', node, oldNode)

    return node
  }

  removeNode (id) {
    const oldNode = this.collection.findOne({ id })

    this.collection.findAndRemove({ id })
    this.emit('change', undefined, oldNode)
  }

  createNode (options = {}) {
    const { typeName } = this.options
    const internal = this.createInternals(options.internal)
    const id = options.id || options._id || this.makeUid(JSON.stringify(options))
    const node = { id, typeName, internal }

    // TODO: remove before 1.0
    node._id = id

    // transform content with transformer for given mime type
    if (internal.content && internal.mimeType) {
      this.transformNodeOptions(options, internal)
    }

    const { fields = {}} = options

    node.title = options.title || fields.title || node.id
    node.date = options.date || fields.date || new Date().toISOString()
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.content = options.content || fields.content || ''
    node.excerpt = options.excerpt || fields.excerpt || ''
    node.path = options.path || this.makePath(node)
    node.withPath = !!options.path

    node.fields = this.processNodeFields(fields, node.internal.origin)

    return node
  }

  createInternals (options = {}) {
    return {
      origin: options.origin,
      mimeType: options.mimeType,
      content: options.content,
      timestamp: Date.now()
    }
  }

  transformNodeOptions (options, internal) {
    const result = this.transform(internal)

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

  processNodeFields (fields, origin) {
    const processField = field => {
      switch (typeof field) {
        case 'object':
          return processFields(field)
        case 'string':
          if (path.extname(field).length > 1) {
            return this.resolveFilePath(origin, field)
          }
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
          ? fields[key].map(processField)
          : processField(fields[key])
      }

      return res
    }

    return processFields(fields)
  }

  resolveFilePath (...args) {
    return this._pluginStore._app.resolveFilePath(...args, this.resolveAbsolutePaths)
  }

  makePath ({ date, slug }) {
    const year = date ? dateFormat(date, 'yyyy') : null
    const month = date ? dateFormat(date, 'mm') : null
    const day = date ? dateFormat(date, 'dd') : null
    const params = { year, month, day, slug }

    // TODO: make custom fields available as route params

    return this.options.makePath(params)
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  slugify (string = '') {
    return slugify(string, { separator: '-' })
  }

  transform ({ mimeType, content }, options) {
    const transformer = this._pluginStore._transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    return transformer.parse(content, options)
  }
}

module.exports = ContentTypeCollection
