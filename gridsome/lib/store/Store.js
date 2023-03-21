const Loki = require('lokijs')
const autoBind = require('auto-bind')
const NodeIndex = require('./NodeIndex')
const EventEmitter = require('eventemitter3')
const { deprecate } = require('../utils/deprecate')
const { isArray, isPlainObject } = require('lodash')
const Collection = require('./Collection')
const { safeKey } = require('../utils')
const lokiOps = require('./lokiOps')

const { SyncWaterfallHook } = require('tapable')
const SyncBailWaterfallHook = require('../app/SyncBailWaterfallHook')

Object.assign(Loki.LokiOps, lokiOps)

class Store {
  constructor (app) {
    this.app = app
    this.collections = {}
    this.nodeIndex = new NodeIndex(app)
    this._events = new EventEmitter()

    this.lastUpdate = null
    this.setUpdateTime()

    autoBind(this)

    this.metadata = new Loki.Collection('core/metadata', {
      unique: ['key'],
      autoupdate: true
    })

    this.hooks = {
      addCollection: new SyncWaterfallHook(['options']),
      addNode: new SyncBailWaterfallHook(['options', 'collection'])
    }

    this.hooks.addNode.tap('TransformNodeContent', require('./transformNodeContent'))
    this.hooks.addNode.tap('ProcessNodeFields', require('./processNodeFields'))
  }

  getHooksContext () {
    return {
      hooks: this.hooks
    }
  }

  on (eventName, fn, ctx) {
    return this._events.on(eventName, fn, ctx)
  }

  off (eventName, fn, ctx) {
    return this._events.removeListener(eventName, fn, ctx)
  }

  // site

  addMetadata (key, data) {
    let node = this.metadata.findOne({ key })

    if (node && isArray(node.data) && isArray(data)) {
      node.data = node.data.concat(data)
    } else if (node && isPlainObject(node.data) && isPlainObject(data)) {
      Object.assign(node.data, data)
    } else if (node) {
      node.data = data
    } else {
      node = this.metadata.insert({ key, data })
    }

    return node
  }

  // nodes

  addCollection (options, store) {
    options = this.hooks.addCollection.call(options)

    if (this.collections.hasOwnProperty(options.typeName)) {
      return this.getCollection(options.typeName)
    }

    const collection = new Collection(
      options.typeName,
      options,
      store
    )

    collection.on('add', node => {
      this.nodeIndex.addEntry(node, collection)
      this.setUpdateTime()
    })

    collection.on('update', node => {
      this.nodeIndex.updateEntry(node, collection)
      this.setUpdateTime()
    })

    collection.on('remove', node => {
      this.nodeIndex.removeEntry(node)
      this.setUpdateTime()
    })

    this.collections[options.typeName] = collection

    return collection
  }

  getCollection (typeName) {
    return this.collections[typeName]
  }

  getNodeByUid (uid) {
    const entry = this.nodeIndex.getEntry(uid)

    return entry
      ? this.collections[entry.typeName].getNodeById(entry.id)
      : null
  }

  getNode (typeName, id) {
    return this.getCollection(typeName).getNodeById(id)
  }

  // TODO: move this to internal plugin
  setBelongsTo (node, typeName, id) {
    const entry = this.nodeIndex.getEntry(node.$uid)
    const belongsTo = entry.belongsTo
    const key = safeKey(id)

    belongsTo[typeName] = belongsTo[typeName] || {}
    belongsTo[typeName][key] = true

    this.nodeIndex.index.update({ ...entry, belongsTo })
  }

  chainIndex (query = {}, resolveNodes = true) {
    const chain = this.nodeIndex.getChain().find(query)

    if (!resolveNodes) {
      return chain
    }

    return chain.map(entry => {
      const collection = this.collections[entry.typeName]
      const node = collection.collection.by('id', entry.id)

      return { ...node, $loki: undefined }
    })
  }

  // utils

  setUpdateTime () {
    this.lastUpdate = Date.now()

    if (this.app.isBootstrapped) {
      this._events.emit('change')
    }
  }

  // deprecated

  addContentType (options, store) {
    deprecate('The store.addContentType() method has been renamed to store.addCollection().')
    return this.addCollection(options, store)
  }

  getContentType (typeName) {
    deprecate('The store.getContentType() method has been renamed to store.getCollection().')
    return this.getCollection(typeName)
  }
}

module.exports = Store
