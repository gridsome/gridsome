const contentful = require('contentful')
const createRichTextType = require('./lib/types/rich-text')

class ContentfulSource {
  static defaultOptions () {
    return {
      space: undefined,
      environment: 'master',
      host: 'cdn.contentful.com',
      typeName: 'Contentful',
      richText: {},
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
    const richTextType = createRichTextType(this.options)

    for (const contentType of contentTypes) {
      const { name, sys: { id }} = contentType
      const typeName = store.makeTypeName(name)
      const route = this.options.routes[name] || `/${store.slugify(name)}/:slug`

      const collection = store.addContentType({ typeName, route })

      for (const field of contentType.fields) {
        if (field.type === 'RichText') {
          collection.addSchemaField(field.id, () => richTextType)
        }
      }

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
      const links = await this.fetch('getEntries', {
        links_to_entry: entry.sys.id
      })

      fields.createdAt = entry.sys.createdAt
      fields.updatedAt = entry.sys.updatedAt
      fields.locale = entry.sys.locale

      if (links.length > 0) {
        fields.links = links
      }

      for (const key in entry.fields) {
        const value = entry.fields[key]

        if (Array.isArray(value)) {
          fields[key] = value.map(item =>
            typeof item === 'object' && typeof item.sys !== 'undefined'
              ? this.createReferenceField(item)
              : item
          )
        } else if (typeof value === 'object' && typeof value.sys !== 'undefined') {
          fields[key] = this.createReferenceField(value)
        } else if (typeof value === 'object' && value.nodeType === 'document') {
          fields[key] = JSON.stringify(value) // Rich Text
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

  async fetch (method, params = {}, limit = 1000, order = 'sys.createdAt') {
    const fetch = skip => this.client[method]({ skip, limit, order, ...params })
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
