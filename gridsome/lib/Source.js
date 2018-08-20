const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')
const EventEmitter = require('events')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const pathToRegexp = require('path-to-regexp')
const parsePageQuery = require('./graphql/parsePageQuery')
const _ = require('lodash')

class Source extends EventEmitter {
  constructor (context, store, typeName, transformers = {}) {
    super()

    this.context = context
    this.store = store
    this.typeName = typeName
    this.transformers = transformers
    this.mime = mime
    this.typeNames = []
  }

  // nodes

  addType (type, options) {
    const typeName = this.makeTypeName(type)

    // function for generating paths from routes for this type
    const makePath = options.route
      ? pathToRegexp.compile(options.route)
      : () => null

    // normalize references
    const refs = _.mapValues(options.refs, ref => ({
      type: ref.type,
      key: ref.key || '_id',
      description: `Reference to ${ref.type}`,
      typeName: this.makeTypeName(ref.type),
      schemaType: Array.isArray(ref.type)
        ? ref.type.map(type => this.makeTypeName(type))
        : this.makeTypeName(ref.type)
    }))

    this.typeNames.push(typeName)

    this.store.addType(typeName, {
      name: typeName,
      route: options.route,
      fields: options.fields,
      mimeTypes: [],
      belongsTo: {},
      makePath,
      type,
      refs
    })
  }

  getType (type) {
    return this.types[type]
  }

  addNode (type, options) {
    const typeName = this.makeTypeName(type)

    // all field names must be camelCased in order to work in GraphQL
    const fields = _.mapKeys(options.fields, (v, key) => camelCase(key))

    const node = {
      type,
      fields,
      typeName,
      _id: options._id,
      refs: options.refs || {},
      internal: this.createInternals(options.internal)
    }

    node.title = options.title || fields.title || options._id
    node.date = options.date || fields.date || new Date().toISOString()
    node.slug = options.slug || fields.slug || this.slugify(node.title)
    node.path = options.path || this.makePath(node)

    // add transformer to content type to let it
    // extend the node type when creating schema
    const { mimeType } = node.internal
    const mimeTypes = this.store.types[typeName].mimeTypes
    if (mimeType && !mimeTypes.hasOwnProperty(mimeType)) {
      mimeTypes[mimeType] = this.transformers[mimeType]
    }

    return this.store.addNode(typeName, node)
  }

  updateNode (_id, options) {}

  removeNode (_id) {}

  // pages

  addPage (type, options) {
    const page = {
      _id: options._id,
      type: type || 'page',
      title: options.title,
      slug: options.slug.replace(/^\/|\/$/g, ''),
      path: null,
      parent: options.parent ? String(options.parent) : null,
      component: options.component,
      file: options.file,
      pageQuery: parsePageQuery(options.pageQuery),
      internal: this.createInternals({ type })
    }

    if (page.type === 'page') {
      page.path = `/${page.slug}`
    }

    this.emit('addPage', page)

    return this.store.addPage(page)
  }

  updatePage (id, options) {
    const page = this.getPage(id)
    const pageQuery = parsePageQuery(options.pageQuery)
    const oldPage = _.cloneDeep(page)

    page.title = options.title
    page.pageQuery = pageQuery

    this.emit('updatePage', page, oldPage)

    return page
  }

  removePage (_id) {
    this.store.removePage(_id)
    this.emit('removePage', _id)
  }

  getPage (_id) {
    return this.store.getPage(_id)
  }

  // misc

  createInternals (options = {}) {
    return {
      mimeType: options.mimeType,
      content: options.content,
      timestamp: Date.now()
    }
  }

  makePath ({ typeName, type, date, slug }) {
    const year = date ? dateFormat(date, 'yyyy') : null
    const month = date ? dateFormat(date, 'mm') : null
    const day = date ? dateFormat(date, 'dd') : null
    const params = { year, month, day, type, slug }

    // TODO: make custom fields available as route params

    return this.store.types[typeName].makePath(params)
  }

  transform (mimeType, content, options) {
    const transformer = this.transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    return transformer.parse(content, options)
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }

  makeTypeName (name = '') {
    return camelCase(`${this.typeName} ${name}`, { pascalCase: true })
  }

  slugify (string) {
    return _.kebabCase(string)
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }

  setupReversedReferences () {
    _.forEach(this.typeNames, typeName => {
      const options = this.store.types[typeName]

      _.forEach(options.refs, (ref, key) => {
        this.store.types[ref.typeName].belongsTo[options.type] = {
          description: `Reference to ${typeName}`,
          localKey: ref.key,
          foreignType: options.type,
          foreignKey: key,
          foreignSchemaType: typeName
        }
      })
    })
  }
}

module.exports = Source
