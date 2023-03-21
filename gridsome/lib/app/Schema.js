const autoBind = require('auto-bind')
const { createSchema } = require('../graphql')
const { graphql, execute } = require('graphql')
const { deprecate } = require('../utils/deprecate')

class Schema {
  constructor (app) {
    this._app = app
    this._schema = null
    this._composer = null
    this._extensions = {}
    this._resolvers = []
    this._schemas = []
    this._types = []

    autoBind(this)
  }

  getSchema () {
    return this._schema
  }

  getComposer () {
    return this._composer
  }

  buildSchema (options = {}) {
    const schemaComposer = createSchema(this._app.store, {
      extensions: { ...this._extensions, ...options.extensions },
      resolvers: this._resolvers.concat(options.resolvers || []),
      schemas: this._schemas.concat(options.schemas || []),
      types: this._types.concat(options.types || [])
    })

    this._schema = schemaComposer.buildSchema()
    this._composer = schemaComposer
    this._extensions = {}
    this._resolvers = []
    this._schemas = []
    this._types = []

    return this
  }

  createContext () {
    const context = {
      store: createStoreActions(this._app.store),
      pages: createPagesAction(this._app.pages),
      config: this._app.config,
      assets: this._app.assets,
      // TODO: remove before 1.0
      queue: this._app.assets
    }

    deprecate.property(context, 'queue', 'The property context.queue is deprecated. Use context.assets instead.')

    return context
  }

  runQuery (docOrQuery, variables = {}, operationName) {
    const context = this.createContext()
    const func = typeof docOrQuery === 'string' ? graphql : execute

    if (!this._schema) {
      throw new Error(`GraphQL schema is not generated yet...`)
    }

    return func(this._schema, docOrQuery, undefined, context, variables, operationName)
  }
}

function createStoreActions (store) {
  return {
    getCollection (typeName) {
      return store.getCollection(typeName)
    },
    getContentType (typeName) {
      deprecate('The context.store.getContentType() method has been renamed to context.store.getCollection()')
      return store.getCollection(typeName)
    },
    getNodeByUid (uid) {
      return store.getNodeByUid(uid)
    },
    getNode (typeName, id) {
      return store.getNode(typeName, id)
    },
    chainIndex (query, resolveNodes) {
      return store.chainIndex(query, resolveNodes)
    }
  }
}

function createPagesAction (pages) {
  return {
    findPage (query) {
      return pages._pages.findOne(query)
    },
    findPages (query) {
      return pages._pages.find(query)
    }
  }
}

module.exports = Schema
