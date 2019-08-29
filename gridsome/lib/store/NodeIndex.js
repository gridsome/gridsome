const { Collection } = require('lokijs')
const { SyncWaterfallHook } = require('tapable')

class NodeIndex {
  constructor (app) {
    this.app = app

    this.hooks = {
      addEntry: new SyncWaterfallHook(['entry', 'node', 'contentType'])
    }

    this.hooks.addEntry.tap('BelongsToProcessor', require('./processNodeReferences'))

    this.index = new Collection('NodeIndex', {
      indices: ['typeName', 'id'],
      unique: ['uid'],
      disableMeta: true
    })
  }

  addEntry (node, contentType) {
    const options = {
      typeName: node.internal.typeName,
      uid: node.$uid,
      id: node.id
    }

    const entry = this.hooks.addEntry.call(
      options,
      node,
      contentType
    )

    this.index.insert(entry)
  }

  updateEntry (node, contentType) {
    const oldEntry = this.index.by('uid', node.$uid)

    const options = {
      $loki: oldEntry.$loki,
      typeName: node.internal.typeName,
      uid: node.$uid,
      id: node.id
    }

    const entry = this.hooks.addEntry.call(
      options,
      node,
      contentType
    )

    this.index.update(entry)
  }

  removeEntry (node) {
    this.index.findAndRemove({ uid: node.$uid })
  }

  getEntry (uid) {
    return this.index.by('uid', uid) || null
  }

  getChain () {
    return this.index.chain()
  }
}

module.exports = NodeIndex
