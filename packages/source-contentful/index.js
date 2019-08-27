const camelCase = require('camelcase')
const contentful = require('contentful')
const createRichTextType = require('./lib/types/rich-text')

class ContentfulSource {
  static defaultOptions () {
    return {
      space: undefined,
      accessToken: undefined,
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
      const typeName = this.createTypeName(name)
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
    const typeName = this.createTypeName('asset')
    const route = this.options.routes.asset || '/asset/:id'

    const contentType = store.addContentType({ typeName, route })

    for (const asset of assets) {
      contentType.addNode({ ...asset.fields, id: asset.sys.id })
    }
  }

  async getEntries (store) {
    const entries = await this.fetch('getEntries')

    for (const entry of entries) {
      const typeId = entry.sys.contentType.sys.id
      const { typeName, displayField } = this.typesIndex[typeId]
      const collection = store.getContentType(typeName)
      const node = {}

      node.title = entry.fields[displayField]
      node.date = entry.sys.createdAt // TODO: deprecate this
      node.createdAt = entry.sys.createdAt
      node.updatedAt = entry.sys.updatedAt
      node.locale = entry.sys.locale

      for (const key in entry.fields) {
        const value = entry.fields[key]

        if (Array.isArray(value)) {
          node[key] = value.map(item => this.isReference(item)
            ? this.createReference(item, store)
            : item
          )
        } else if (this.isReference(value)) {
          node[key] = this.createReference(value, store)
        } else if (this.isRichText(value)) {
          node[key] = JSON.stringify(value) // Rich Text
        } else {
          node[key] = value
        }
      }

      node.id = entry.sys.id

      collection.addNode(node)
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

  createReference (item, store) {
    switch (item.sys.type) {
      case 'Asset' :
        return store.createReference(
          this.createTypeName('asset'),
          item.sys.id
        )

      case 'Entry' :
        const contentType = this.typesIndex[item.sys.contentType.sys.id]
        const typeName = this.createTypeName(contentType.name)

        return store.createReference(typeName, item.sys.id)
    }
  }

  createTypeName (name = '') {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }

  isReference (value) {
    return typeof value === 'object' && typeof value.sys !== 'undefined'
  }

  isRichText (value) {
    return typeof value === 'object' && value.nodeType === 'document'
  }
}

module.exports = ContentfulSource
