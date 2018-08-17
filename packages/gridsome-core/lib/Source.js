const Base = require('./Base')
const crypto = require('crypto')
const mime = require('mime-types')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const graphql = require('./graphql/graphql')
const pathToRegexp = require('path-to-regexp')
const parsePageQuery = require('./graphql/parsePageQuery')
const _ = require('lodash')

class Source extends Base {
  constructor (store, transformers, context, options) {
    super(context, options)

    this.store = store
    this.transformers = transformers
    this.graphql = graphql
    this.mime = mime
    this.namespace = null

    autoBind(this)
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

    this.store.addType(typeName, {
      name: typeName,
      route: options.route,
      fields: options.fields,
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

    const node = {
      type,
      typeName,
      _id: options._id,
      title: options.title,
      slug: _.trim(options.path || options.slug, '/'),
      created: options.created ? new Date(options.created) : new Date(),
      updated: options.updated ? new Date(options.updated) : new Date(),
      fields: _.mapKeys(options.fields, (v, key) => this.camelCase(key)),
      data: options.data,
      content: options.content || '',
      excerpt: options.excerpt || '',
      link: null,
      refs: options.refs || {},
      internal: this.createInternals({ type })
    }

    node.path = options.path || this.makePath(node)

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
      created: options.created ? new Date(options.created) : new Date(),
      updated: options.updated ? new Date(options.updated) : new Date(),
      data: options.data,
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

  createInternals (options) {
    return {
      type: options.type,
      owner: '' // this.plugin.uid
    }
  }

  makePath ({ typeName, type, created, slug }) {
    const year = created ? dateFormat(created, 'yyyy') : null
    const month = created ? dateFormat(created, 'mm') : null
    const day = created ? dateFormat(created, 'dd') : null
    const params = { year, month, day, type, slug }

    // TODO: make custom fields available as route params

    return this.store.types[typeName].makePath(params)
  }

  transform (string, mimeType, options, file) {
    const transformer = this.transformers[mimeType]

    if (!transformer) {
      throw new Error(`No transformer for ${mimeType} is installed.`)
    }

    return transformer.parse(string, options, file)
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(this.namespace + orgId).digest('hex')
  }

  makeTypeName (name) {
    return this.pascalCase(`${this.options.typeNamePrefix} ${name}`)
  }

  slugify (string) {
    return _.kebabCase(string)
  }

  camelCase (string) {
    return camelCase(string)
  }

  pascalCase (string) {
    return camelCase(string, { pascalCase: true })
  }

  onAfter () {
    // create foreign references
    _.forEach(this.store.types, (options, typeName) => {
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
