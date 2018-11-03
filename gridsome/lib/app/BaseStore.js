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

  //
  // helpers
  //

  resolveNodeFilePath (node, toPath) {
    const { collection: { fileBasePath } } = this.getContentType(node.typeName)
    return this.app.resolveFilePath(node.internal.origin, toPath, fileBasePath)
  }
}

module.exports = BaseStore
