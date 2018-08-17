const Loki = require('lokijs')

class Datastore {
  constructor () {
    this.data = new Loki()
    this.collections = {}
    this.taxonomies = {}
    this.types = {}

    this.pages = this.data.addCollection('Page', {
      indices: ['type'],
      unique: ['path'],
      autoupdate: true
    })
  }

  // nodes

  addType (type, options) {
    this.types[type] = options
    this.collections[type] = this.data.addCollection(type, {
      unique: ['_id', 'path'],
      indices: ['type'],
      autoupdate: true
    })
  }

  getType (type) {
    return this.collections[type]
  }

  addNode (type, options) {
    return this.collections[type].insert(options)
  }

  // taxonomies

  addTaxonomy (type, options) {
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

module.exports = Datastore
