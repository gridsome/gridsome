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

    api.loadSource(args => this.fetchContentfulContent(args))
  }

  async fetchContentfulContent (store) {
    const { addContentType, getContentType, makeTypeName, slugify } = store
    const { space, accessToken, environment, host, routes } = this.options

    const client = contentful.createClient({
      space, accessToken, environment, host
    })

    const { items: assets } = await client.getAssets()

    const assetCollection = addContentType({
      typeName: makeTypeName('asset')
    })

    for (const asset of assets) {
      const fields = asset.fields

      assetCollection.addNode({
        _id: asset.sys.id,
        fields
      })
    }

    const { items: contentTypes } = await client.getContentTypes()
    const cache = { contentTypes: {}}

    for (const contentType of contentTypes) {
      cache.contentTypes[contentType.sys.id] = contentType
    }

    for (const contentType of contentTypes) {
      const collection = addContentType({
        typeName: makeTypeName(contentType.name),
        route: routes[contentType.name] || `/${slugify(contentType.name)}/:slug`,
        refs: contentType.fields.reduce((refs, { id, items }) => {
          if (items && items.type === 'Link' && items.linkType === 'Entry') {
            refs[id] = {
              key: '_id',
              typeName: items.validations.reduce((types, { linkContentType }) => {
                linkContentType.forEach(id => {
                  const contentType = cache.contentTypes[id]
                  const typeName = makeTypeName(contentType.name)
                  types.push(typeName)
                })

                return types
              }, [])
            }
          }

          return refs
        }, {})
      })

      for (const field of contentType.fields) {
        if (field.type === 'Link' && field.linkType === 'Asset') {
          collection.addReference(field.name, {
            typeName: makeTypeName('asset'),
            key: '_id'
          })
        }
      }
    }

    const { items: entries } = await client.getEntries()

    for (const item of entries) {
      const id = item.sys.contentType.sys.id
      const contentType = cache.contentTypes[id]
      const typeName = makeTypeName(contentType.name)
      const collection = getContentType(typeName)

      const fields = contentType.fields.reduce((fields, { id, type, items }) => {
        if (!item.fields[id]) return fields

        if (items) {
          if (items.type === 'Link' && items.linkType === 'Entry') {
            fields[id] = item.fields[id].map(item => item.sys.id)
          }
        } else {
          if (type === 'Link') {
            fields[id] = [item.fields[id].sys.id]
          } else {
            fields[id] = item.fields[id]
          }
        }

        return fields
      })

      // TODO: let user choose which field contains the slug
      collection.addNode({
        _id: item.sys.id,
        title: item.fields[contentType.displayField],
        slug: item.fields.slug || '',
        created: new Date(item.sys.createdAt),
        updated: new Date(item.sys.updatedAt),
        fields
      })
    }
  }
}

module.exports = ContentfulSource
