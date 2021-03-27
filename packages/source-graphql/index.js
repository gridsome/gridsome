const { setContext } = require('apollo-link-context')
const { HttpLink } = require('apollo-link-http')
const fetch = require('node-fetch')

const {
  wrapSchema,
  introspectSchema,
  RenameTypes,
  makeRemoteExecutableSchema,
} = require(`@graphql-tools/wrap`)
const { linkToExecutor } = require(`@graphql-tools/links`)

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
      const executor = this.newExecutor(url, headers)
      const remoteSchema = await this.getRemoteExecutableSchema(executor)
      const namespacedSchema = this.namespaceSchema(
        remoteSchema,
        fieldName,
        typeName
      )

      addSchema(namespacedSchema)
    })
  }

  newExecutor (url, headers) {
    const http = new HttpLink({ uri: url, fetch })
    const link = setContext(() => ({ headers })).concat(http)
    return linkToExecutor(link)
  }

  async getRemoteExecutableSchema(executor) {
    const schema = await introspectSchema(executor)

    return makeRemoteExecutableSchema({
      schema,
      executor
    })
  }

  namespaceSchema(schema, fieldName, typeName, executor) {
    const transforms = [
      new StripNonQueryTransform(),
      new RenameTypes(name => `${typeName}_${name}`),
      new NamespaceUnderFieldTransform(typeName, fieldName)
    ]

    return wrapSchema({
      schema,
      transforms,
      executor
    })
  }
}

module.exports = GraphQLSource
