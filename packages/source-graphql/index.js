const { setContext } = require('apollo-link-context')
const { HttpLink } = require('apollo-link-http')
const {
  introspectSchema,
  makeRemoteExecutableSchema,
  transformSchema,
  RenameTypes
} = require('graphql-tools')
const fetch = require('node-fetch')

const {
  NamespaceUnderFieldTransform,
  StripNonQueryTransform
} = require(`./transforms`)

class GraphQLSource {
  static defaultOptions () {
    return {
      url: undefined,
      fieldName: undefined,
      typeName: undefined,
      headers: {}
    }
  }

  constructor (api, options) {
    this.api = api
    const { url, fieldName, headers } = options
    let typeName = options.typeName

    // Make sure all required props are passed

    if (!url) {
      throw new Error(`Missing url option.`)
    }

    if (!fieldName) {
      throw new Error(`Missing fieldName option.`)
    }

    // If typeName isn't defined, default to fieldName

    if (!typeName) {
      typeName = fieldName
    }

    // Fetch schema, namespace it, and merge it into local schema
    api.createSchema(async ({ addSchema, graphql }) => {
      const remoteSchema = await this.getRemoteExecutableSchema(url, headers)
      const namespacedSchema = await this.namespaceSchema(
        remoteSchema,
        fieldName,
        typeName,
        graphql
      )

      return namespacedSchema
    })
  }

  async getRemoteExecutableSchema (url, headers) {
    const http = new HttpLink({
      uri: url,
      fetch
    })
    const link = setContext((request, previousContext) => ({ headers })).concat(
      http
    )
    const remoteSchema = await introspectSchema(link)
    const remoteExecutableSchema = await makeRemoteExecutableSchema({
      schema: remoteSchema,
      link
    })

    return remoteExecutableSchema
  }

  async namespaceSchema (schema, fieldName, typeName, graphql) {
    const namespacedSchema = transformSchema(schema, [
      new StripNonQueryTransform(),
      new RenameTypes(name => `${typeName}_${name}`),
      new NamespaceUnderFieldTransform({
        typeName,
        fieldName,
        graphql
      })
    ])

    return namespacedSchema
  }
}

module.exports = GraphQLSource
