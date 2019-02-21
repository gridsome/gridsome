const CockpitSDK = require('cockpit-sdk').default
const { GraphQLJSON } = require('gridsome/graphql')
const { camelize } = require('humps')

class CockpitSource {
  static defaultOptions () {
    return {
      token: undefined,
      typeName: 'Cockpit',
      routes: {}
    }
  }

  constructor (api, options) {
    this.options = options
    this.store = api.store
    this.typesIndex = {}

    this.client = new CockpitSDK({
      host: options.host,
      accessToken: options.accessToken
    })

    api.loadSource(async store => {
      await this.getContentTypes(store)
      await this.getAssets(store)
      await this.getEntries(store)
    })
  }

  async getContentTypes (store) {
    const collectionTypes = await this.fetch('collectionList')

    for (const collectionType of collectionTypes) {
      const name = collectionType
      const typeName = store.makeTypeName(collectionType)
      const route = this.options.routes[name] || `/${store.slugify(name)}/:slug`

      const collection = store.addContentType({ typeName, route })

      this.typesIndex[typeName] = { collectionType, typeName }
    }
  }

  async getAssets (store) {
    const assets = await this.fetch('assets')
    const typeName = store.makeTypeName('asset')
    const route = this.options.routes.asset || '/asset/:id'

    const contentType = store.addContentType({ typeName, route })

    for (const asset of assets.assets) {
      const { _id: id, title, created: date, ...fields } = asset

      contentType.addNode({ id, date, title, fields })
    }
  }

  async getEntries (store) {
    for (const key in this.typesIndex) {
      const collectionType = this.typesIndex[key].collectionType
      const data = await this.fetch('collectionGet', collectionType)
      const typeName = store.makeTypeName(collectionType)

      data.entries.forEach(entry => {
        const collection = store.getContentType(typeName)

        const fields = Object.keys(data.fields)
          .map(f => data.fields[f].name)
          .reduce((x, y) => ({ ...x, [y]: entry[y] }), {})

        collection.addNode({
          id: entry._id,
          title: entry.title || '',
          slug: entry.slug || '',
          date: new Date(entry._created * 1000),
          fields
        })

        // Process fields.
        Object.keys(data.fields).forEach(async f => {
          const fieldDefinition = data.fields[f]
          if (fieldDefinition.type === 'repeater') {
            collection.addSchemaField(fieldDefinition.name, () => ({
              type: GraphQLJSON,
              resolve: node => node.fields[camelize(fieldDefinition.name)]
            }))
          }
        })
      })
    }
  }

  async fetch (method, type = '', limit = 1000, order = { _created: -1 }) {
    const fetch = skip => this.client[method](type, { skip, limit: limit })
    const result = await fetch(0)
    return result
  }
}

module.exports = CockpitSource
