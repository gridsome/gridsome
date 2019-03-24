const Loki = require('lokijs')
const autoBind = require('auto-bind')
const EventEmitter = require('eventemitter3')
const { omit, isArray, isPlainObject } = require('lodash')
const ContentTypeCollection = require('./ContentTypeCollection')

class BaseStore {
  constructor (app) {
    this.app = app
    this.data = new Loki()
    this.collections = {}
    this.taxonomies = {}
    this.lastUpdate = null
    this._events = new EventEmitter()

    this.setUpdateTime()

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

  on (eventName, fn, ctx) {
    return this._events.on(eventName, fn, ctx)
  }

  off (eventName, fn, ctx) {
    return this._events.removeListener(eventName, fn, ctx)
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

  getContentType (typeName) {
    return this.collections[typeName]
  }

  getNodeByPath (path) {
    const node = this.index.findOne({ path })

    if (!node) return null

    return this.getContentType(node.typeName).getNode({ uid: node.uid })
  }

  chainIndex (query = {}) {
    return this.index.chain().find(query).map(entry => {
      const type = this.collections[entry.typeName]
      const node = type.collection.by('id', entry.id)
      return omit(node, '$loki')
    })
  }

  // utils

  setUpdateTime () {
    this.lastUpdate = Date.now()

    if (this.app.isBootstrapped) {
      this._events.emit('change')
    }
  }
}

module.exports = BaseStore
