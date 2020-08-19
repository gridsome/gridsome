const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const { deprecate } = require('../utils/deprecate')
const { mapValues, isPlainObject } = require('lodash')
const { cache, nodeCache } = require('../utils/cache')
const { resolvePath } = require('./utils')

class PluginStore {
  constructor (app, pluginOptions = {}, { transformers }) {
    autoBind(this)

    const { typeName, resolveAbsolutePaths } = pluginOptions

    this._app = app
    this._typeName = typeName
    this._resolveAbsolutePaths = resolveAbsolutePaths || false

    this._transformers = mapValues(transformers || app.config.transformers, transformer => {
      return this._createTransformer(
        transformer.TransformerClass,
        transformer.options,
        pluginOptions[transformer.name]
      )
    })

    this.context = app.context
    this.store = app.store
    this.mime = mime
  }

  // metadata

  addMetadata (key, data) {
    return this.store.addMetadata(key, data)
  }

  // collections

  addCollection (options) {
    if (typeof options === 'string') {
      options = { typeName: options }
    }

    if (typeof options.resolveAbsolutePaths === 'undefined') {
      options.resolveAbsolutePaths = this._resolveAbsolutePaths
    }

    if (options.route && !this._app.config.templates[options.typeName]) {
      deprecate(
        `The route option in addCollection() ` +
        `is deprecated. Use templates instead.`,
        {
          url: 'https://gridsome.org/docs/templates/'
        }
      )
    }

    return this.store.addCollection(options, this)
  }

  getCollection (type) {
    return this.store.getCollection(type)
  }

  getNodeByUid (uid) {
    return this.store.getNodeByUid(uid)
  }

  //
  // misc
  //

  _createInternals (options = {}) {
    return {
      origin: options.origin,
      mimeType: options.mimeType,
      content: options.content,
      timestamp: Date.now()
    }
  }

  _resolveNodeFilePath (node, toPath) {
    const collection = this.getCollection(node.internal.typeName)
    const { origin = '' } = node.internal

    return resolvePath(origin, toPath, {
      context: collection._assetsContext,
      resolveAbsolute: collection._resolveAbsolutePaths
    })
  }

  _createTransformer (TransformerClass, options, localOptions = {}) {
    const args = {
      resolveNodeFilePath: this._resolveNodeFilePath,
      context: this._app.context,
      assets: this._app.assets,
      localOptions,
      // TODO: remove before 1.0
      queue: this._app.assets,
      nodeCache,
      cache
    }

    deprecate.property(args, 'queue', 'The queue property is renamed to assets.')
    deprecate.property(args, 'nodeCache', 'Do not use the nodeCache property. It will be removed.')
    deprecate.property(args, 'cache', 'Do not use the cache property. It will be removed.')

    return new TransformerClass(options, args)
  }

  _addTransformer (TransformerClass, options = {}) {
    for (const mimeType of TransformerClass.mimeTypes()) {
      this._transformers[mimeType] = this._createTransformer(
        TransformerClass,
        options
      )
    }
  }

  //
  // utils
  //

  createTypeName (name = '') {
    if (!this._typeName) {
      throw new Error(`Missing typeName option.`)
    }

    return camelCase(`${this._typeName} ${name}`, { pascalCase: true })
  }

  createReference (typeName, id) {
    if (isPlainObject(typeName)) {
      if (!typeName.$loki) {
        throw new Error(`store.createReference() expected a node.`)
      }

      return { typeName: typeName.internal.typeName, id: typeName.id }
    }

    const value = Array.isArray(id) ? id.map(String) : String(id)

    return { typeName, id: value }
  }

  //
  // deprecated
  //

  addContentType(options) {
    deprecate('The store.addContentType() method has been renamed to store.addCollection().')
    return this.addCollection(options)
  }

  getContentType(type) {
    deprecate('The store.getContentType() method has been renamed to store.getCollection().')
    return this.store.getCollection(type)
  }

  addMetaData (key, data) {
    deprecate('The store.addMetaData() method has been renamed to store.addMetadata().')
    return this.addMetadata(key, data)
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  makeTypeName (name = '') {
    return this.createTypeName(name)
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }

  slugify (value) {
    return this._app.slugify(value)
  }
}

module.exports = PluginStore
