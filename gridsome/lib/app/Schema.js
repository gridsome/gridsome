const autoBind = require('auto-bind')
const { graphql, execute } = require('graphql')
const createContext = require('../graphql/createContext')
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

  createSchemaContext () {
    return createContext(this._app)
  }

  runQuery (docOrQuery, variables = {}) {
    const func = typeof docOrQuery === 'object' ? execute : graphql
    const context = this.createSchemaContext()

    if (typeof docOrQuery === 'string') {
      // workaround until query directives
      // works in mergeSchema from graphql-tools
      docOrQuery = docOrQuery.replace(/@paginate/g, '')
    }

    return func(this._schema, docOrQuery, undefined, context, variables)
  }
}

module.exports = Schema
