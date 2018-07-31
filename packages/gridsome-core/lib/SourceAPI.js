const Datastore = require('nedb')
const uuidv3 = require('uuid/v3')
const autoBind = require('auto-bind')
const camelCase = require('camelcase')
const dateFormat = require('dateformat')
const graphql = require('./graphql/graphql')
const pathToRegexp = require('path-to-regexp')
const validateQuery = require('./graphql/utils/validate-query')

const loadOwnPages = async (store, owner) => new Promise((resolve, reject) => {
  store.find({ 'internal.owner': owner }, (err, pages) => err ? reject(err) : resolve(pages))
})

const loadAll = async store => new Promise((resolve, reject) => {
  store.find({}, (err, nodes) => err ? reject(err) : resolve(nodes))
})

const updateNodeData = async (transformers, store, node) => {
  const { mediaType } = node.internal
  const data = mediaType && node.content
    ? transformers[mediaType].parse(node.content)
    : null

  const query = { _id: node._id }
  const update = { $set: { data: JSON.stringify(data) } }

  return new Promise((resolve, reject) => {
    store.update(query, update, {}, err => err ? reject(err) : resolve())
  })
}

module.exports = class SourceAPI {
  constructor (service, plugin) {
    this.service = service
    this.plugin = plugin
    this.graphql = graphql
    this.namespace = null
    this.mediaType = null

    this.types = {}
    this.nodes = new Datastore()
    this.nodes.ensureIndex({ fieldName: 'type' })
    this.nodes.ensureIndex({ fieldName: 'path', unique: true })

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
        updated: new Date(options.updated),
      },
      refs: options.refs || {},
      internal: this.createInternals({
        type: options.type
      })
    }

    node.path = this.makePath(node)

    return new Promise((resolve, reject) => {
      this.nodes.insert(node, (err, node) => {
        if (err) reject(err)
        else resolve(node)
      })
    })
  }

  updateNode ({ _id, ...$set }) {
    const options = { returnUpdatedDocs: true }

    return new Promise((resolve, reject) => {
      this.nodes.update({ _id }, { $set }, options, (err, count, node) => {
        if (err) reject(err)
        else resolve(node)
      })
    })
  }

  addPage (options) {
    const page = {
      _id: options._id,
      type: options.type || 'page',
      title: options.title,
      slug: options.slug.replace(/^\/|\/$/g, ''),
      path: null,
      created: options.created,
      updated: options.updated,
      data: options.data,
      graphql: options.graphql || {},
      parent: options.parent ? String(options.parent) : null,
      component: options.component,
      internal: this.createInternals({})
    }

    if (page.graphql.type) {
      page.graphql.connection = camelCase(`all ${page.graphql.type}`)
    }

    if (page.type === 'page') {
      page.path = `/${page.slug}`
    }

    return new Promise((resolve, reject) => {
      this.service.pages.insert(page, (err, page) => {
        if (err) reject(err)
        else resolve(page)
      })
    })
  }

  updatePage ({ _id, ...$set }) {
    const q = { _id }
    const update = { $set }
    const options = { returnUpdatedDocs: true }

    return new Promise((resolve, reject) => {
      this.service.pages.update(q, update, options, (err, count, page) => {
        if (err) reject(err)
        else resolve(page)
      })
    })
  }

  // graphql

  updateQuery (_id, graphql) {
    return new Promise((resolve, reject) => {
      const options = { returnUpdatedDocs: true }

      const update = {
        $set: {
          'graphql.query': null,
          'graphql.options': null
        }
      }

      if (graphql.query) {
        const err = validateQuery(this.service.schema, graphql.query)

        if (err && err.length) {
          return reject(err)
        }

        update.$set['graphql.query'] = graphql.query
        update.$set['graphql.options'] = graphql.options
      }

      this.service.pages.update({ _id }, update, options, (err, count, page) => {
        if (err) return reject(err)

        this.service.broadcast({
          query: graphql.query,
          component: page.component
        })

        resolve(page)
      })
    })
  }

  // helpers

  async transformAll () {
    const nodes = await loadAll(this.nodes)
    const pages = await loadOwnPages(this.service.pages, this.plugin.uid)

    for (const node of nodes) await this.transformNode(node)
    for (const page of pages) await this.transformPage(page)
  }

  transformNode (node) {
    const { transformers } = this.service
    return updateNodeData(transformers, this.nodes, node)
  }

  transformPage (page) {
    const { transformers, pages } = this.service
    return updateNodeData(transformers, pages, page)
  }

  stringify (data) {
    const { transformers } = this.service
    return transformers[this.mediaType].stringify(data)
  }

  createInternals (options) {
    return {
      ...options,
      mediaType: this.mediaType,
      namespace: this.namespace,
      owner: this.plugin.uid
    }
  }

  makeUid (orgId) {
    // TODO: improve id generation
    return uuidv3(this.namespace + orgId, uuidv3.DNS)
  }

  makeTypeName (name) {
    return camelCase(`${this.namespace} ${name}`, { pascalCase: true })
  }

  makePath ({ created, slug, internal: { type } }) {
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
