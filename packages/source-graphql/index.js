const { setContext } = require('apollo-link-context')
const { HttpLink } = require('apollo-link-http')
const fetch = require('node-fetch')

const {
  introspectSchema,
  makeRemoteExecutableSchema,
  transformSchema,
  RenameTypes
} = require('graphql-tools')

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
    api.createSchema(async ({ addSchema }) => {
      const remoteSchema = await this.getRemoteExecutableSchema(url, headers)
      const namespacedSchema = await this.namespaceSchema(
        remoteSchema,
        fieldName,
        typeName
      )

      addSchema(namespacedSchema)
    })
  }

  async getRemoteExecutableSchema (uri, headers) {
    const http = new HttpLink({ uri, fetch })
    const link = setContext(() => ({ headers })).concat(http)
    const remoteSchema = await introspectSchema(link)

    return makeRemoteExecutableSchema({
      schema: remoteSchema,
      link
    })
  }

  namespaceSchema (schema, fieldName, typeName) {
    return transformSchema(schema, [
      new StripNonQueryTransform(),
      new RenameTypes(name => `${typeName}_${name}`),
      new NamespaceUnderFieldTransform(typeName, fieldName)
    ])
  }
}

module.exports = GraphQLSource
