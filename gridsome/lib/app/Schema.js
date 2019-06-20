const autoBind = require('auto-bind')
const { graphql, execute } = require('graphql')
const createSchemaComposer = require('../graphql/createSchema')

class Schema {
  constructor (app) {
    this._app = app
    this._schema = null
    this._composer = null

    autoBind(this)
  }

  getSchema () {
    return this._schema
  }

  getComposer () {
    return this._composer
  }

  buildSchema (options = {}) {
    const schemaComposer = createSchemaComposer(this._app.store, options)

    this._composer = schemaComposer
    this._schema = schemaComposer.buildSchema()

    return this
  }

  createContext () {
    return {
      store: createStoreActions(this._app.store),
      pages: createPagesAction(this._app.pages),
      config: this._app.config,
      assets: this._app.assets,
      // TODO: remove before 1.0
      queue: this._app.assets
    }
  }

  runQuery (docOrQuery, variables = {}) {
    const context = this.createContext()
    const func = typeof docOrQuery === 'string' ? graphql : execute

    if (!this._schema) {
      throw new Error(`GraphQL schema is not generated yet...`)
    }

    return func(this._schema, docOrQuery, undefined, context, variables)
  }
}

function createStoreActions (store) {
  return {
    getContentType (typeName) {
      return store.getContentType(typeName)
    },
    getNodeByUid (uid) {
      return store.getNodeByUid(uid)
    },
    getNode (typeName, id) {
      return store.getNode(typeName, id)
    },
    chainIndex (query) {
      return store.chainIndex(query)
    }
  }
}

function createPagesAction (pages) {
  return {
    findPage (query) {
      return pages.findPage(query)
    },
    findPages (query) {
      return pages.findPages(query)
    }
  }
}

module.exports = Schema
