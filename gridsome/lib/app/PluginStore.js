const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const pathToRegexp = require('path-to-regexp')
const slugify = require('@sindresorhus/slugify')
const { NODE_FIELDS } = require('../utils/constants')
const { mapValues, isPlainObject } = require('lodash')
const { cache, nodeCache } = require('../utils/cache')
const { log } = require('../utils/log')

class Source {
  constructor (app, options, { transformers }) {
    autoBind(this)

    this._app = app
    this._typeName = options.typeName
    this._resolveAbsolutePaths = options.resolveAbsolutePaths || false
    this._transformers = mapValues(transformers || app.config.transformers, transformer => {
      return new transformer.TransformerClass(transformer.options, {
        localOptions: options[transformer.name] || {},
        resolveNodeFilePath: this._resolveNodeFilePath,
        context: app.context,
        queue: app.queue,
        cache,
        nodeCache
      })
    })

    this.context = app.context
    this.store = app.store
    this.mime = mime
  }

  // data

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

    const { templatesDir } = this._app.config
    const component = templatesDir
      ? path.join(templatesDir, `${options.typeName}.vue`)
      : null

    return this.store.addContentType(this, {
      route: options.route,
      fields: options.fields || {},
      typeName: options.typeName,
      routeKeys: routeKeys
        .filter(key => typeof key.name === 'string')
        .map(key => {
          // separate field name from suffix
          const [, fieldName, suffix] = (
            key.name.match(/^(.*[^_])_([a-z]+)$/) ||
            [null, key.name, null]
          )
          const path = !NODE_FIELDS.includes(fieldName)
            ? ['fields'].concat(fieldName.split('__'))
            : [fieldName]

          return {
            name: key.name,
            path,
            fieldName,
            repeat: key.repeat,
            suffix
          }
        }),
      resolveAbsolutePaths: options.resolveAbsolutePaths,
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
    const contentType = this.getContentType(node.typeName)

    return this._app.resolveFilePath(
      node.internal.origin,
      toPath,
      contentType.resolveAbsolutePaths
    )
  }

  //
  // utils
  //

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  makeTypeName (name = '') {
    if (!this._typeName) {
      throw new Error(`Missing typeName option.`)
    }

    return camelCase(`${this._typeName} ${name}`, { pascalCase: true })
  }

  createReference (typeName, id) {
    if (isPlainObject(typeName)) {
      return { typeName: typeName.typeName, id: typeName.id }
    }

    return { typeName, id }
  }

  slugify (string = '') {
    return slugify(string, { separator: '-' })
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }
}

module.exports = Source
