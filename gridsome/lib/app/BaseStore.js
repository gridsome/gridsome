const Loki = require('lokijs')
const autoBind = require('auto-bind')
const ContentTypeCollection = require('./ContentTypeCollection')

class BaseStore {
  constructor (app) {
    this.app = app
    this.data = new Loki()
    this.collections = {}
    this.taxonomies = {}

    autoBind(this)

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
    const node = this.metaData.findOne({ key })
    
    return node
      ? Object.assign(node.data, data)
      : this.metaData.insert({ key, data })
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
