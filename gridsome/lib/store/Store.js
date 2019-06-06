const Loki = require('lokijs')
const autoBind = require('auto-bind')
const NodeIndex = require('./NodeIndex')
const EventEmitter = require('eventemitter3')
const { isArray, isPlainObject } = require('lodash')
const { BOOTSTRAP_SOURCES } = require('../utils/constants')
const ContentType = require('./ContentType')

const { SyncWaterfallHook } = require('tapable')
const SyncBailWaterfallHook = require('../app/SyncBailWaterfallHook')

class Store {
  constructor (app) {
    this.app = app
    this.store = new Loki()
    this.collections = {}
    this.taxonomies = {}
    this.lastUpdate = null
    this.nodeIndex = new NodeIndex(app)
    this._events = new EventEmitter()

    this.setUpdateTime()

    autoBind(this)

    this.metaData = this.store.addCollection('core/metaData', {
      unique: ['key'],
      autoupdate: true
    })

    this.hooks = {
      addContentType: new SyncWaterfallHook(['options']),
      addNode: new SyncBailWaterfallHook(['options', 'collection'])
    }

    this.hooks.addNode.tap('TransformNodeContent', require('./transformNodeContent'))
    this.hooks.addNode.tap('ProcessNodeFields', require('./processNodeFields'))
    this.hooks.addNode.tap('GenerateNodePath', require('./generateNodePath'))

    app.hooks.bootstrap.tapPromise(
      {
        name: 'GridsomeStore',
        label: 'Load sources',
        phase: BOOTSTRAP_SOURCES
      },
      () => this.loadSources()
    )
  }

  getHooksContext () {
    return {
      hooks: this.hooks
    }
  }

  async loadSources () {
    await this.app.events.dispatch('loadSource', api => api.store)
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
