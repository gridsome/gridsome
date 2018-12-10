const Loki = require('lokijs')
const autoBind = require('auto-bind')
const { isArray, isPlainObject } = require('lodash')
const ContentTypeCollection = require('./ContentTypeCollection')

class BaseStore {
  constructor (app) {
    this.app = app
    this.data = new Loki()
    this.collections = {}
    this.taxonomies = {}

    autoBind(this)

    this.index = this.data.addCollection('nodeIndex', {
      indices: ['path', 'typeName', 'id'],
      unique: ['uid', 'path'],
      autoupdate: true
    })

    this.pages = this.data.addCollection('Page', {
      indices: ['type'],
      unique: ['path'],
      autoupdate: true
    })

    this.metaData = this.data.addCollection('MetaData', {
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

    if (!entry) {
      return null
    }

    const { collection } = this.getContentType(entry.typeName)

    return collection.getNode(entry.id)
  }

  // taxonomies

  addTaxonomy (pluginStore, options) {
    // TODO: implement taxonomies
  }

  getTaxonomy (type) {
    // TODO: implement taxonomies
  }

  // pages

  addPage (options) {
    return this.pages.insert(options)
  }

  getPage (_id) {
    return this.pages.findOne({ _id })
  }

  removePage (_id) {
    return this.pages.findAndRemove({ _id })
  }
}

module.exports = BaseStore
