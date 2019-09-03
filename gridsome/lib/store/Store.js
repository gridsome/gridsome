const { Collection } = require('lokijs')
const autoBind = require('auto-bind')
const NodeIndex = require('./NodeIndex')
const EventEmitter = require('eventemitter3')
const { isArray, isPlainObject } = require('lodash')
const ContentType = require('./ContentType')
const { safeKey } = require('../utils')

const { SyncWaterfallHook } = require('tapable')
const SyncBailWaterfallHook = require('../app/SyncBailWaterfallHook')

class Store {
  constructor (app) {
    this.app = app
    this.collections = {}
    this.nodeIndex = new NodeIndex(app)
    this._events = new EventEmitter()

    this.lastUpdate = null
    this.setUpdateTime()

    autoBind(this)

    this.metadata = new Collection('core/metadata', {
      unique: ['key'],
      autoupdate: true
    })

    this.hooks = {
      addContentType: new SyncWaterfallHook(['options']),
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

  addContentType (options, store) {
    options = this.hooks.addContentType.call(options)

    if (this.collections.hasOwnProperty(options.typeName)) {
      return this.getContentType(options.typeName)
    }

    const contentType = new ContentType(
      options.typeName,
      options,
      store
    )

    contentType.on('add', node => {
      this.nodeIndex.addEntry(node, contentType)
      this.setUpdateTime()
    })

    contentType.on('update', node => {
      this.nodeIndex.updateEntry(node, contentType)
      this.setUpdateTime()
    })

    contentType.on('remove', node => {
      this.nodeIndex.removeEntry(node)
      this.setUpdateTime()
    })

    this.collections[options.typeName] = contentType

    return contentType
  }

  getContentType (typeName) {
    return this.collections[typeName]
  }

  getNodeByUid (uid) {
    const entry = this.nodeIndex.getEntry(uid)

    return entry
      ? this.collections[entry.typeName].getNodeById(entry.id)
      : null
  }

  getNode (typeName, id) {
    return this.getContentType(typeName).getNodeById(id)
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

  chainIndex (query = {}) {
    return this.nodeIndex.getChain().find(query).map(entry => {
      const contentType = this.collections[entry.typeName]
      const node = contentType.collection.by('id', entry.id)

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
}

module.exports = Store
