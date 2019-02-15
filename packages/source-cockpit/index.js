const CockpitSDK = require('cockpit-sdk').default;

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

      store.addContentType({ typeName, route })

      this.typesIndex[typeName] = { collectionType, typeName }
    }
  }

  async getAssets (store) {
    const assets = await this.fetch('assets')
    const typeName = store.makeTypeName('asset')
    const route = this.options.routes.asset || '/asset/:id'

    const contentType = store.addContentType({ typeName, route })

    for (const asset of assets.assets) {
      const {
        _id,
        title,
        created,
        modified,
        ...fields
      } = asset

      contentType.addNode({
        id: _id,
        title: title,
        date: created,
        fields: {
          ...fields
        }
      })

    }
  }

  async getEntries (store) {
    for (const key in this.typesIndex) {
     
      const collectionType = this.typesIndex[key].collectionType
      const data = await this.fetch('collectionGet', collectionType)
      const typeName = store.makeTypeName(collectionType)

      const fieldDefinitions = data.fields
      
      data.entries.forEach(i => {

        const collection = store.getContentType(typeName)

        const entry = Object.keys(data.fields)
         .map(f => data.fields[f].name)
         .reduce((x, y) => ({ ...x, [y]: i[y] }), {});

        // 'content' is a reserved key in Gridsome so rename.
        if ('content' in entry) {
          Object.defineProperty(entry, 'field_content',
            Object.getOwnPropertyDescriptor(entry, 'content'));
          delete entry['content'];
        }

        const node = {
          id: i._id,
          title: i.title || '',
          slug: i.slug || '',
          date: new Date(i._created * 1000),
        };

        // Process fields.
        Object.keys(data.fields).forEach(async f => {
        })

        node.fields = { ...entry }

        collection.addNode(node)
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
