const Loki = require('lokijs')
const autoBind = require('auto-bind')
const { uniqBy, isArray, isPlainObject } = require('lodash')
const ContentTypeCollection = require('./ContentTypeCollection')

class BaseStore {
  constructor (app) {
    this.app = app
    this.data = new Loki()
    this.collections = {}
    this.taxonomies = {}

    autoBind(this)

    this.index = this.data.addCollection('core/nodeIndex', {
      indices: ['path', 'typeName', 'id'],
      unique: ['uid', 'path'],
      autoupdate: true
    })

    this.pages = this.data.addCollection('core/page', {
      indices: ['type'],
      unique: ['path'],
      autoupdate: true
    })

    this.metaData = this.data.addCollection('core/metaData', {
      unique: ['key'],
      autoupdate: true
    })
  }

  // site

  addMetaData (key, data) {
    let node = this.metaData.findOne({ key })

    if (node && isArray(node.data) && isArray(data)) {
      node.data = node.data.concat(data)
    } else if (node && isPlainObject(node.data) && isPlainObject(data)) {
      Object.assign(node.data, data)
    } else {
      node = this.metaData.insert({ key, data })
    }

    return node
  }

  // nodes

  addContentType (pluginStore, options) {
    const collection = new ContentTypeCollection(this, pluginStore, options)
    this.collections[options.typeName] = collection
    return collection
  }

  getContentType (type) {
    return this.collections[type]
  }

  getNodeByPath (path) {
    const entry = this.index.findOne({ path })

    if (!entry || entry.type === 'page') {
      return null
    }

    return this.getContentType(entry.typeName).getNode({ uid: entry.uid })
  }

  chainIndex (query = {}) {
    let chain = this.index.chain().find(query)
    const typeNames = uniqBy(chain.data(), 'typeName').map(entry => entry.typeName)
    const joinMapper = (left, right) => ({ ...left, ...right })
    const joinOptions = { removeMeta: true }

    for (let i = 0, l = typeNames.length; i < l; i++) {
      const { collection } = this.getContentType(typeNames[i])
      chain = chain.eqJoin(collection, 'uid', 'uid', joinMapper, joinOptions)
    }

    return chain
  }

  // pages

  addPage (options) {
    return this.pages.insert(options)
  }

  getPage (id) {
    return this.pages.findOne({ id })
  }

  removePage (id) {
    return this.pages.findAndRemove({ id })
  }
}

module.exports = BaseStore
