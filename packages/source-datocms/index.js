const { SiteClient, Loader, ItemsRepo, i18n } = require('datocms-client')
const { camelize } = require('humps')

const withNoEmptyValues = (object) => {
  if (Object.prototype.toString.call(object) === '[object Object]') {
    const result = {}

    for (const [key, value] of Object.entries(object)) {
      const valueWithNoEmptyValues = withNoEmptyValues(value)
      if (valueWithNoEmptyValues) {
        result[key] = valueWithNoEmptyValues
      }
    }

    return Object.entries(result).length > 0 ? result : null
  }

  if (Object.prototype.toString.call(object) === '[object Array]') {
    const result = object.map(x => withNoEmptyValues(x)).filter(x => !!x)
    return result.length > 0 ? result : null
  }

  return object
}

class DatoCmsSource {
  static defaultOptions () {
    return {
      typeName: 'DatoCms',
      apiToken: undefined,
      previewMode: false,
      apiUrl: undefined
    }
  }

  constructor (api, options) {
    this.options = options
    api.loadSource(args => this.fetchContent(args))
  }

  createTypeName (name) {
    const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '')

    return (
      this.options.typeName.charAt(0).toUpperCase() +
      camelize(`${this.options.typeName} ${cleanName}`).slice(1)
    )
  }

  async fetchContent (store) {
    const { addCollection, getCollection } = store
    const { apiToken, apiUrl, previewMode } = this.options

    const clientHeaders = {
      'X-Reason': 'dump',
      'X-SSG': 'gridsome'
    }

    const client = apiUrl
      ? new SiteClient(apiToken, clientHeaders, apiUrl)
      : new SiteClient(apiToken, clientHeaders)

    const loader = new Loader(client, previewMode)
    await loader.load()

    const { entitiesRepo } = loader
    const itemsRepo = new ItemsRepo(loader.entitiesRepo)
    const { site } = loader.entitiesRepo
    i18n.availableLocales = site.locales
    i18n.locale = site.locales[0]

    const cache = {}

    for (const itemType of itemsRepo.itemTypes) {
      const { titleField, fields } = itemType

      const slugField = fields.find(({ fieldType }) => fieldType === 'slug')

      cache[itemType.id] = { titleField, slugField }

      const collection = addCollection(
        this.createTypeName(itemType.name),
      )

      fields
        .filter(({ fieldType }) => ['link', 'links', 'rich_text'].includes(fieldType))
        .forEach((field) => {
          const typeNames = (
            field.validators.itemItemType ||
            field.validators.itemsItemType ||
            field.validators.richTextBlocks
          ).itemTypes.map((id) => (
            this.createTypeName(entitiesRepo.findEntity('item_type', id).name)
          ))

          collection.addReference(
            camelize(field.apiKey),
            {
              typeName: typeNames.length > 1 ? typeNames : typeNames[0]
            }
          )
        })
    }

    for (const item of Object.values(itemsRepo.itemsById)) {
      const { titleField, slugField } = cache[item.itemType.id]
      const typeName = this.createTypeName(item.itemType.name)
      const collection = getCollection(typeName)

      const node = {
        id: item.id,
        title: titleField && item[camelize(titleField.apiKey)],
        slug: slugField && item[camelize(slugField.apiKey)],
        created: new Date(item.createdAt),
        updated: new Date(item.updatedAt),
        position: item.position,
        ...item.itemType.fields.reduce((fields, field) => {
          const val = item.readAttribute(field)

          if (item.itemType.hasOwnProperty('apiKey')) {
            fields.model = { apiKey: item.itemType.apiKey }
          }

          if (!val) return fields

          if (['link', 'links', 'rich_text'].includes(field.fieldType)) {
            const val = item.entity[camelize(field.apiKey)]
            const sanitizedVal = Array.isArray(val) ? withNoEmptyValues(val) : val

            if (!sanitizedVal) return fields

            fields[camelize(field.apiKey)] = sanitizedVal

            return fields
          } else {
            fields[camelize(field.apiKey)] = val.toMap
              ? withNoEmptyValues(val.toMap())
              : withNoEmptyValues(val)

            return fields
          }
        }, {})
      }

      collection.addNode(node)
    }
  }
}

module.exports = DatoCmsSource
