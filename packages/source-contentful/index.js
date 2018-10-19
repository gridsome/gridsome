const contentful = require('contentful')

class ContentfulSource {
  static defaultOptions () {
    return {
      space: undefined,
      environment: 'master',
      host: 'cdn.contentful.com',
      typeName: 'Contentful'
    }
  }

  constructor (options, { context, source }) {
    this.options = options
    this.context = context
    this.source = source
  }

  async apply () {
    const { space, accessToken, environment, host } = this.options

    const client = contentful.createClient({
      space, accessToken, environment, host
    })

    const refs = {}
    const cache = { contentTypes: {}}
    const { items: contentTypes } = await client.getContentTypes()

    for (const contentType of contentTypes) {
      // filter out fields which are not references
      const fields = contentType.fields.filter(({ type, items }) => {
        if (items) return items.type !== 'Link'
        return type !== 'Link'
      })

      // get all reference fields
      // TODO: include Asset references
      refs[contentType.sys.id] = contentType.fields.filter(({ items }) => {
        return items && items.type === 'Link' && items.linkType === 'Entry'
      })

      // cache results to let entries access them...
      cache.contentTypes[contentType.sys.id] = {
        contentType,
        fields,
        refs
      }
    }

    for (const contentType of contentTypes) {
      this.source.addType(contentType.name, {
        name: contentType.name,
        refs: refs[contentType.sys.id].reduce((refs, field) => {
          refs[field.id] = {
            key: '_id',
            type: field.items.validations.reduce((types, { linkContentType }) => {
              linkContentType.forEach(id => {
                types.push(cache.contentTypes[id].contentType.name)
              })
              return types
            }, [])
          }

          return refs
        }, {})
      })
    }

    const { items: entries } = await client.getEntries()

    for (const item of entries) {
      const id = item.sys.contentType.sys.id
      const { contentType, fields, refs } = cache.contentTypes[id]

      // TODO: let user choose which field contains the slug

      this.source.addNode(contentType.name, {
        _id: this.source.makeUid(item.sys.id),
        title: item.fields[contentType.displayField],
        slug: item.fields.slug || '',
        created: new Date(item.sys.createdAt),
        updated: new Date(item.sys.updatedAt),

        fields: fields.reduce((fields, { id }) => {
          if (!item.fields[id]) return fields
          fields[id] = item.fields[id]
          return fields
        }, {}),

        refs: refs[contentType.sys.id].reduce((refs, { id }) => {
          if (!item.fields[id]) return refs

          refs[id] = item.fields[id].map(item => {
            return this.source.makeUid(item.sys.id)
          })

          return refs
        }, {})
      })
    }
  }
}

module.exports = ContentfulSource
