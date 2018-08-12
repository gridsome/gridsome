const EventEmitter = require('events')
const crypto = require('crypto')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const { Collection } = require('lokijs')
const graphql = require('./graphql/graphql')
const pathToRegexp = require('path-to-regexp')
const { cloneDeep, kebabCase } = require('lodash')
const parsePageQuery = require('./graphql/parsePageQuery')
// const validateQuery = require('./graphql/utils/validateQuery')

class SourceAPI extends EventEmitter {
  constructor (service, plugin) {
    super()

    this.service = service
    this.plugin = plugin
    this.graphql = graphql
    this.slugify = kebabCase
    this.namespace = null
    this.mediaType = null

    this.types = {}
    this.nodes = new Collection('nodes', {
      indices: ['type', 'created'],
      unique: ['_id', 'path'],
      autoupdate: true
    })

    autoBind(this)
  }

  setNamespace (namespace) {
    this.namespace = namespace
  }

  setMediaType (mediaType) {
    this.mediaType = mediaType
  }

  addType (options) {
    const route = options.route || `/${options.type}/:slug`
    const makePath = pathToRegexp.compile(route)

    this.types[options.type] = {
      type: this.makeTypeName(options.type),
      name: options.name,
      belongsTo: options.belongsTo,
      fields: options.fields,
      refs: options.refs,

      makePath,
      route
    }
  }

  getType (type) {
    return this.types[this.makeTypeName(type)]
  }

  addNode (options) {
    const node = {
      _id: options._id,
      type: this.makeTypeName(options.type),
      title: options.title,
      slug: options.slug.replace(/^\/|\/$/g, ''),
      created: options.created ? new Date(options.created) : new Date(),
      updated: options.updated ? new Date(options.updated) : new Date(),
      data: options.data,
      content: options.content || '',
      link: null,
      fields: {
        ...options.fields,
        title: options.title,
        created: new Date(options.created),
        updated: new Date(options.updated)
      },
      refs: options.refs || {},
      internal: this.createInternals({
        type: options.type
      })
    }

    node.path = this.makePath(node)

    return this.nodes.insert(node)
  }

  updateNode (node) {
    return this.nodes.update(node)
  }

  addPage (options) {
    const page = {
      _id: options._id,
      type: options.type || 'page',
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
      internal: this.createInternals({})
    }

    if (page.type === 'page') {
      page.path = `/${page.slug}`
    }

    this.service.pages.insert(page)
    this.emit('addPage', page)
  }

  updatePage (options) {
    const page = this.getPage(options._id)
    const pageQuery = parsePageQuery(options.pageQuery)
    const oldPage = cloneDeep(page)

    page.title = options.title
    page.pageQuery = pageQuery

    this.emit('updatePage', page, oldPage)
  }

  removePage (_id) {
    this.service.pages.findAndRemove({ _id })
    this.emit('removePage', _id)
  }

  getPage (_id) {
    return this.service.pages.findOne({ _id })
  }

  // helpers

  createInternals (options) {
    return {
      ...options,
      mediaType: this.mediaType,
      namespace: this.namespace,
      owner: this.plugin.uid
    }
  }

  makeUid (orgId) {
    return crypto.createHash('md5').update(this.namespace + orgId).digest('hex')
  }

  makeTypeName (name) {
    return camelCase(`${this.namespace} ${name}`, { pascalCase: true })
  }

  makePath ({ created, slug, internal: { type }}) {
    const year = created ? dateFormat(created, 'yyyy') : null
    const month = created ? dateFormat(created, 'mm') : null
    const day = created ? dateFormat(created, 'dd') : null

    // TODO: make custom fields available as route params

    return this.types[type].makePath({ year, month, day, type, slug })
  }

  camelCase (string) {
    return camelCase(string)
  }

  pascalCase (string) {
    return camelCase(string, { pascalCase: true })
  }
}

module.exports = SourceAPI
