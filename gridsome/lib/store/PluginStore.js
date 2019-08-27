const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const pathToRegexp = require('path-to-regexp')
const slugify = require('@sindresorhus/slugify')
const { mapValues, isPlainObject } = require('lodash')
const { cache, nodeCache } = require('../utils/cache')
const { resolvePath } = require('./utils')
const { log } = require('../utils/log')

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

  addMetaData (key, data) {
    return this.store.addMetaData(key, data)
  }

  // nodes

  addType (...args) {
    log('!! store.addType is deprectaded, use store.addContentType instead.')
    return this.addContentType(...args)
  }

  addContentType (options) {
    if (typeof options === 'string') {
      options = { typeName: options }
    }

    if (typeof options.typeName !== 'string') {
      throw new Error(`«typeName» option is required.`)
    }

    if (['page'].includes(options.typeName.toLowerCase())) {
      throw new Error(`${options.typeName} is a reserved typeName`)
    }

    if (this.store.collections.hasOwnProperty(options.typeName)) {
      return this.store.getContentType(options.typeName)
    }

    options = this._app._hooks.contentType.call(options, this._app)

    let createPath = () => null
    const routeKeys = []

    if (typeof options.route === 'string') {
      options.route = '/' + options.route.replace(/^\/+/g, '')
      createPath = pathToRegexp.compile(options.route)
      pathToRegexp(options.route, routeKeys)
    }

    // normalize references
    const refs = mapValues(options.refs, (ref, key) => {
      return {
        typeName: ref.typeName || options.typeName,
        fieldName: key
      }
    })

    if (typeof options.resolveAbsolutePaths === 'undefined') {
      options.resolveAbsolutePaths = this._resolveAbsolutePaths
    }

    const dateField = options.dateField || 'date'
    const defaultSortBy = dateField
    const defaultSortOrder = 'DESC'

    let component

    if (typeof options.component !== 'undefined') {
      component = typeof options.component === 'string'
        ? path.isAbsolute(options.component)
          ? options.component
          : path.join(this.context, options.component)
        : null
    } else {
      const { templatesDir } = this._app.config
      component = templatesDir
        ? path.join(templatesDir, `${options.typeName}.vue`)
        : null
    }

    return this.store.addContentType(this, {
      route: options.route,
      fields: options.fields || {},
      typeName: options.typeName,
      dateField,
      defaultSortBy,
      defaultSortOrder,
      camelCasedFieldNames: options.camelCasedFieldNames,
      resolveAbsolutePaths: options.resolveAbsolutePaths,
      routeKeys: routeKeys
        .filter(key => typeof key.name === 'string')
        .map(key => {
          // separate field name from suffix
          const [, fieldName, suffix] = (
            key.name.match(/^(.*[^_])_([a-z]+)$/) ||
            [null, key.name, null]
          )

          const path = fieldName.split('__')

          return {
            name: key.name,
            path,
            fieldName,
            repeat: key.repeat,
            suffix
          }
        }),
      mimeTypes: [],
      belongsTo: {},
      createPath,
      component,
      refs
    })
  }

  getContentType (type) {
    return this.store.getContentType(type)
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
    const contentType = this.getContentType(node.internal.typeName)
    const { origin = '' } = node.internal

    return resolvePath(origin, toPath, {
      context: contentType._assetsContext,
      resolveAbsolute: contentType._resolveAbsolutePaths
    })
  }

  _createTransformer (TransformerClass, options, localOptions = {}) {
    return new TransformerClass(options, {
      resolveNodeFilePath: this._resolveNodeFilePath,
      context: this._app.context,
      assets: this._app.assets,
      localOptions,
      // TODO: remove before 1.0
      queue: this._app.assets,
      nodeCache,
      cache
    })
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

    return { typeName, id }
  }

  slugify (string = '') {
    return slugify(string, { separator: '-' })
  }

  //
  // deprecated
  //

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  makeTypeName (name = '') {
    return this.createTypeName(name)
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }
}

module.exports = PluginStore
