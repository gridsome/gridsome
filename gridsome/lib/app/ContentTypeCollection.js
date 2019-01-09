const path = require('path')
const crypto = require('crypto')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const slugify = require('@sindresorhus/slugify')
const { cloneDeep, isObject } = require('lodash')
const { warn } = require('../utils/log')

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
      mimeTypes[mimeType] = this.pluginStore._transformers[mimeType]
    }

    try {
      this.baseStore.index.insert({
        type: 'node',
        path: node.path,
        typeName: node.typeName,
        uid: node.uid,
        id: node.id,
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
    return this.collection.findOne({ id })
  }

  updateNode (id, options) {
    const node = this.getNode(id)
    const oldNode = cloneDeep(node)
    const indexEntry = this.baseStore.index.findOne({ uid: node.uid })
    const internal = this.createInternals(options.internal)

    // transform content with transformer for given mime type
    if (internal.content && internal.mimeType) {
      this.transformNodeOptions(options, internal)
    }

    const { fields = {}} = options

    node.title = options.title || fields.title || node.title
    node.date = options.date || fields.date || node.date
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.content = options.content || fields.content || node.content
    node.excerpt = options.excerpt || fields.excerpt || node.excerpt
    node.internal = Object.assign({}, node.internal, internal)
    node.path = typeof options.path === 'string'
      ? '/' + options.path.replace(/^\/+/g, '')
      : this.makePath(node)

    node.fields = this.processNodeFields(fields, node.internal.origin)
    indexEntry.path = node.path

    this.emit('change', node, oldNode)

    return node
  }

  removeNode (id) {
    const node = this.collection.findOne({ id })

    this.baseStore.index.findAndRemove({ uid: node.uid })
    this.collection.findAndRemove({ id })

    this.emit('change', undefined, node)
  }

  createNode (options = {}) {
    const { typeName } = this.options
    const hash = crypto.createHash('md5')
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

    node.uid = hash.update(typeName + node.id).digest('hex')
    node.title = options.title || fields.title || node.id
    node.date = options.date || fields.date || new Date().toISOString()
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.content = options.content || fields.content || ''
    node.excerpt = options.excerpt || fields.excerpt || ''
    node.withPath = typeof options.path === 'string'

    node.fields = this.processNodeFields(fields, node.internal.origin)
    node.path = typeof options.path === 'string'
      ? '/' + options.path.replace(/^\/+/g, '')
      : this.makePath(node)

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
      if (field === undefined) return field
      if (field === null) return field

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
    return this.pluginStore._app.resolveFilePath(...args, this.resolveAbsolutePaths)
  }

  makePath (node) {
    const year = node.date ? dateFormat(node.date, 'yyyy') : null
    const month = node.date ? dateFormat(node.date, 'mm') : null
    const day = node.date ? dateFormat(node.date, 'dd') : null
    const params = { year, month, day, slug: node.slug }
    const { routeKeys } = this.options

    // Use root level fields as route params. Primitive values
    // are slugified but the original value will be available
    // with '_raw' suffix.
    for (let i = 0, l = routeKeys.length; i < l; i++) {
      const keyName = routeKeys[i]
      const fieldValue = node.fields[keyName] || node[keyName] || keyName

      if (
        isObject(fieldValue) &&
        fieldValue.hasOwnProperty('typeName') &&
        fieldValue.hasOwnProperty('id') &&
        !Array.isArray(fieldValue.id)
      ) {
        params[keyName] = String(fieldValue.id)
      } else if (!isObject(fieldValue) && !params[keyName]) {
        params[keyName] = this.slugify(String(fieldValue))
        params[keyName + '_raw'] = String(fieldValue)
      }
    }

    return this.options.makePath(params)
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  slugify (string = '') {
    return slugify(string, { separator: '-' })
  }

  transform ({ mimeType, content }, options) {
    const transformer = this.pluginStore._transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    return transformer.parse(content, options)
  }
}

module.exports = ContentTypeCollection
