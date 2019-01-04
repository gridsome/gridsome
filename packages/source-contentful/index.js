const contentful = require('contentful')

class ContentfulSource {
  static defaultOptions () {
    return {
      space: undefined,
      environment: 'master',
      host: 'cdn.contentful.com',
      typeName: 'Contentful',
      routes: {}
    }
  }

  constructor (api, options) {
    this.options = options
    this.store = api.store
    this.typesIndex = {}

    this.client = contentful.createClient({
      accessToken: options.accessToken,
      environment: options.environment,
      space: options.space,
      host: options.host
    })

    api.loadSource(args => this.fetchContentfulContent(args))
  }

  async fetchContentfulContent (store) {
    const contentTypes = await this.fetchPaged('getContentTypes')
    const assetData = await this.fetchPaged('getAssets')
    const entryData = await this.fetchPaged('getEntries')

    const entries = this.client.parseEntries({
      items: entryData,
      includes: {
        Asset: assetData,
        Entry: entryData
      }
    })

    const assets = store.addContentType({
      typeName: store.makeTypeName('asset'),
      route: this.options.routes.asset || '/asset/:slug'
    })

    for (const asset of assetData) {
      assets.addNode({ id: asset.sys.id, fields: asset.fields })
    }

    for (const contentType of contentTypes) {
      this.typesIndex[contentType.sys.id] = contentType

      const { name } = contentType
      const typeName = store.makeTypeName(name)
      const route = this.options.routes[name] || `/${store.slugify(name)}/:slug`

      store.addContentType({ typeName, route })
    }

    for (const entry of entries.items) {
      const id = entry.sys.contentType.sys.id
      const contentType = this.typesIndex[id]
      const typeName = store.makeTypeName(contentType.name)
      const collection = store.getContentType(typeName)
      const fields = {}

      fields.createdAt = entry.sys.createdAt
      fields.updatedAt = entry.sys.updatedAt
      fields.locale = entry.sys.locale

      for (const key in entry.fields) {
        const value = entry.fields[key]

        if (Array.isArray(value)) {
          fields[key] = value.map(item =>
            typeof item === 'object' ? this.createReferenceField(item) : item
          )
        } else if (typeof value === 'object') {
          fields[key] = this.createReferenceField(value)
        } else {
          fields[key] = value
        }
      }

      collection.addNode({
        id: entry.sys.id,
        title: entry.fields[contentType.displayField],
        slug: entry.fields.slug || '', // TODO: let user choose which field contains the slug
        date: entry.sys.createdAt,
        fields
      })
    }
  }

  async fetchPaged (method, limit = 1000, order = 'sys.createdAt') {
    const fetch = skip => this.client[method]({ skip, limit, order, resolveLinks: false })
    const { total, items } = await fetch(0)
    const pages = Math.ceil(total / limit)

    for (let i = 1; i < pages; i++) {
      const res = await fetch(limit * i)
      items.push(...res.items)
    }

    return items
  }

  createReferenceField (item) {
    switch (item.sys.type) {
      case 'Asset' :
        return {
          typeName: this.store.makeTypeName('asset'),
          id: item.sys.id
        }

      case 'Entry' :
        const contentType = this.typesIndex[item.sys.contentType.sys.id]

        return {
          typeName: this.store.makeTypeName(contentType.name),
          id: item.sys.id
        }
    }
  }
}

module.exports = ContentfulSource
