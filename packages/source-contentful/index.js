const contentful = require('contentful')
const contentfulRenderer = require('@contentful/rich-text-html-renderer');

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

    api.loadSource(async store => {
      await this.getContentTypes(store)
      await this.getAssets(store)
      await this.getEntries(store)
    })
  }

  async getContentTypes (store) {
    const contentTypes = await this.fetch('getContentTypes')

    for (const contentType of contentTypes) {
      const { name, sys: { id }} = contentType
      const typeName = store.makeTypeName(name)
      const route = this.options.routes[name] || `/${store.slugify(name)}/:slug`

      store.addContentType({ typeName, route })

      this.typesIndex[id] = { ...contentType, typeName }
    }
  }

  async getAssets (store) {
    const assets = await this.fetch('getAssets')
    const typeName = store.makeTypeName('asset')
    const route = this.options.routes.asset || '/asset/:id'

    const contentType = store.addContentType({ typeName, route })

    for (const asset of assets) {
      contentType.addNode({ id: asset.sys.id, fields: asset.fields })
    }
  }

  async getEntries (store) {
    const entries = await this.fetch('getEntries')

    for (const entry of entries) {
      const id = entry.sys.contentType.sys.id
      const { typeName, displayField } = this.typesIndex[id]
      const collection = store.getContentType(typeName)
      const fields = {}

      fields.createdAt = entry.sys.createdAt
      fields.updatedAt = entry.sys.updatedAt
      fields.locale = entry.sys.locale

      for (const key in entry.fields) {
        const value = entry.fields[key]

        if (Array.isArray(value)) {
          fields[key] = value.map(item =>
            typeof item === 'object' && typeof value.sys !== 'undefined'
              ? this.createReferenceField(item)
              : item
          )
        } else if (typeof value === 'object' && typeof value.sys !== 'undefined') {
          fields[key] = this.createReferenceField(value)
        } else if (typeof value === 'object' && value.nodeType === 'document') {
          // value is Rich Text
          fields[key] = {
            document: JSON.stringify(value),
            html: contentfulRenderer.documentToHtmlString(value)
          }
        } else {
          fields[key] = value
        }
      }

      collection.addNode({
        id: entry.sys.id,
        title: entry.fields[displayField],
        slug: entry.fields.slug || '', // TODO: let user choose which field contains the slug
        date: entry.sys.createdAt,
        fields
      })
    }
  }

  async fetch (method, limit = 1000, order = 'sys.createdAt') {
    const fetch = skip => this.client[method]({ skip, limit, order })
    const { total, items } = await fetch(0)
    const pages = Math.ceil(total / limit)

    for (let i = 1; i < pages; i++) {
      const res = await fetch(limit * i)
      items.push(...res.items)
    }

    return items
  }

  createReferenceField (item) {
    console.log('item', item)
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
