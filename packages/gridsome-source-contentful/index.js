const contentful = require('contentful')
const resolveType = require('./lib/resolve-type')

module.exports = (api, {
  space,
  accessToken,
  environment,
  host,
  namespace
}) => {
  api.initSource = async ({
    setNamespace,
    addType,
    getType,
    addNode,
    makeUid,
    graphql
  }) => {
    setNamespace(namespace)

    const client = contentful.createClient({
      space,
      accessToken,
      environment,
      host
    })

    const cache = { contentTypes: {}}
    const { items: contentTypes } = await client.getContentTypes()

    api.service.info(`Content types (${contentTypes.length})`, namespace)

    for (const contentType of contentTypes) {
      // filter out fields which are not references
      const fields = contentType.fields.filter(({ type, items }) => {
        if (items) return items.type !== 'Link'
        return type !== 'Link'
      })

      // get all reference fields
      // TODO: include Asset references
      const refs = contentType.fields.filter(({ items }) => {
        return items && items.type === 'Link' && items.linkType === 'Entry'
      })

      // cache results to let entries access them...
      cache.contentTypes[contentType.sys.id] = {
        contentType,
        fields,
        refs
      }

      await addType({
        type: contentType.name,
        name: contentType.name,
        fields: () => fields.reduce((fields, field) => {
          fields[field.id] = {
            description: field.name,
            type: resolveType(field, graphql)
          }

          return fields
        }, {}),
        refs: ({ addReference, nodeTypes }) => refs.forEach(field => addReference({
          name: field.id,
          description: field.name,
          types: field.items.validations.reduce((types, { linkContentType }) => {
            linkContentType.forEach(id => {
              const { type } = getType(cache.contentTypes[id].contentType.name)
              types.push(nodeTypes[type])
            })
            return types
          }, [])
        }))
      })
    }

    const { items: entries } = await client.getEntries()

    api.service.info(`Entries (${entries.length})`, namespace)

    for (const item of entries) {
      const id = item.sys.contentType.sys.id
      const { contentType, fields, refs } = cache.contentTypes[id]

      // TODO: let user choose which field contains the slug

      await addNode({
        _id: makeUid(item.sys.id),
        type: contentType.name,
        title: item.fields[contentType.displayField],
        slug: item.fields.slug || '',
        created: new Date(item.sys.createdAt),
        updated: new Date(item.sys.updatedAt),

        fields: fields.reduce((fields, { id }) => {
          if (!item.fields[id]) return fields
          fields[id] = item.fields[id]
          return fields
        }, {}),

        refs: refs.reduce((refs, { id }) => {
          if (!item.fields[id]) return refs

          refs[id] = item.fields[id].map(item => {
            return makeUid(item.sys.id)
          })

          return refs
        }, {})
      })
    }
  }
}

module.exports.defaultOptions = {
  environment: 'master',
  host: 'cdn.contentful.com',
  namespace: 'Contentful'
}
