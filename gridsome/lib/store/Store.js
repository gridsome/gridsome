const Loki = require('lokijs')
const autoBind = require('auto-bind')
const EventEmitter = require('eventemitter3')
const { omit, isArray, isPlainObject } = require('lodash')
const ContentType = require('./ContentType')
const { safeKey } = require('../utils')

class Store {
  constructor (app) {
    this.app = app
    this.store = new Loki()
    this.collections = {}
    this.taxonomies = {}
    this.lastUpdate = null
    this._events = new EventEmitter()

    this.setUpdateTime()

    autoBind(this)

    this.index = this.store.addCollection('core/nodeIndex', {
      indices: ['typeName', 'id'],
      unique: ['uid'],
      disableMeta: true
    })

    this.metaData = this.store.addCollection('core/metaData', {
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
    } else if (node) {
      node.data = data
    } else {
      node = this.metaData.insert({ key, data })
    }

    return node
  }

  // nodes

  addContentType (pluginStore, options) {
    const collection = this.store.addCollection(options.typeName, {
      indices: ['id', 'path', 'internal.typeName'],
      unique: ['id', 'path'],
      disableMeta: true
    })

    const contentType = new ContentType(pluginStore, collection, options)

    this.collections[options.typeName] = contentType

    return contentType
  }

  getContentType (typeName) {
    return this.collections[typeName]
  }

  getNodeByUid (uid) {
    const entry = this.index.by('uid', uid)

    return entry
      ? this.collections[entry.typeName].getNodeById(entry.id)
      : null
  }

  getNode (typeName, id) {
    return this.getContentType(typeName).getNodeById(id)
  }

  // TODO: move this to internal plugin
  setBelongsTo (node, typeName, id) {
    const entry = this.index.by('uid', node.$uid)
    const belongsTo = entry.belongsTo
    const key = safeKey(id)

    belongsTo[typeName] = belongsTo[typeName] || {}
    belongsTo[typeName][key] = true

    this.index.update({ ...entry, belongsTo })
  }

  chainIndex (query = {}) {
    return this.index.chain().find(query).map(entry => {
      const contentType = this.collections[entry.typeName]
      const node = contentType.collection.by('id', entry.id)
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

module.exports = Store
