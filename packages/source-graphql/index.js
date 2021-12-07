const fetch = require('node-fetch')
const { print, GraphQLNonNull, GraphQLObjectType } = require('gridsome/graphql')
const { introspectSchema, wrapSchema, RenameTypes } = require('@graphql-tools/wrap')

const {
  addTypes,
  mapSchema,
  MapperKind,
  modifyObjectFields
} = require('@graphql-tools/utils')

module.exports = (api, options) => {
  const { url, fieldName, headers, typeName = fieldName } = options

  if (!url) {
    throw new Error('Missing url option.')
  }

  if (!fieldName) {
    throw new Error('Missing fieldName option.')
  }

  async function remoteExecutor ({ document, variables }) {
    const query = print(document)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ query, variables })
    })
    return res.json()
  }

  api.createSchema(async ({ addSchema }) => {
    addSchema(
      wrapSchema({
        schema: await introspectSchema(remoteExecutor),
        executor: remoteExecutor,
        transforms: [
          new StripNonQuery(),
          new WarpQueryType(typeName, fieldName),
          new RenameTypes(name => `${typeName}_${name}`)
        ]
      })
    )
  })
}

class WarpQueryType {
  constructor (typeName, fieldName) {
    this.typeName = typeName
    this.fieldName = fieldName
  }

  transformSchema (schema) {
    const config = schema.getQueryType().toConfig()
    const queryType = new GraphQLObjectType({ ...config, name: this.typeName })
    const newSchema = addTypes(schema, [queryType])

    const rootFields = {
      [this.fieldName]: {
        type: new GraphQLNonNull(queryType),
        resolve: () => ({})
      }
    }

    return modifyObjectFields(newSchema, config.name, () => true, rootFields)[0]
  }
}

class StripNonQuery {
  transformSchema (schema) {
    return mapSchema(schema, {
      [MapperKind.MUTATION] () {
        return null
      },
      [MapperKind.SUBSCRIPTION] () {
        return null
      }
    })
  }
}
