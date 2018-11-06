const { SiteClient, Loader } = require('datocms-client');
const { camelize } = require('humps');

const withNoEmptyValues = (hash) => {
  if (Object.prototype.toString.call(hash) !== '[object Object]') {
    return hash;
  }

  const result = {};

  for (const [key, value] of Object.entries(hash)) {
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

class DatoCmsSource {
  static defaultOptions() {
    return {
      typeName: 'DatoCms',
      apiToken: undefined,
      previewMode: false,
      apiUrl: undefined,
    }
  }

  constructor (options, { context, source }) {
    this.options = options
    this.context = context
    this.source = source
  }

  async apply () {
    const { apiToken, apiUrl, previewMode, typeName } = this.options

    const clientHeaders = {
      'X-Reason': 'dump',
      'X-SSG': 'gridsome',
    };

    const client = apiUrl ?
      new SiteClient(apiToken, clientHeaders, apiUrl) :
      new SiteClient(apiToken, clientHeaders)

    const loader = new Loader(client, previewMode)
    await loader.load()

    const { itemsRepo, entitiesRepo } = loader;

    const cache = {};

    for (const itemType of itemsRepo.itemTypes) {
      const { titleField, fields } = itemType

      const slugField = fields.find(({ fieldType }) => fieldType === 'slug')
      const linkFields = fields.filter(({ fieldType }) => ['link', 'links', 'rich_text'].includes(fieldType))
      const otherFields = fields.filter(({ fieldType }) => !['link', 'links', 'rich_text'].includes(fieldType))

      cache[itemType.id] = { titleField, slugField, linkFields, otherFields }

      const type = {
        name: itemType.name,
        refs: linkFields.reduce((refs, field) => {
          refs[camelize(field.apiKey)] = {
            key: '_id',
            type: (
              field.validators.itemItemType ||
                field.validators.itemsItemType ||
                field.validators.richTextBlocks
              )
              .itemTypes.map((id) => (
                entitiesRepo.findEntity('item_type', id).name
              ))
          }

          return refs
        }, {})
      }

      this.source.addType(itemType.name, type)
    }

    for (const item of Object.values(itemsRepo.itemsById)) {
      const { titleField, slugField, linkFields, otherFields } = cache[item.itemType.id]

      const node = {
        _id: this.source.makeUid(item.id),
        title: titleField && item[camelize(titleField.apiKey)],
        slug: slugField && item[camelize(slugField.apiKey)],
        created: new Date(item.createdAt),
        updated: new Date(item.updatedAt),
        fields: otherFields.reduce((fields, field) => {
          const val = item.readAttribute(field)
          if (!val) return fields

          fields[camelize(field.apiKey)] = val && val.toMap ?
            withNoEmptyValues(val.toMap()) :
            val

          return fields
        }, {}),
        refs: linkFields.reduce((refs, { apiKey }) => {
          const val = item.entity[camelize(apiKey)]
          const arrayVal = Array.isArray(val) ? val : [val]
          if (arrayVal.length === 0) return refs
          refs[camelize(apiKey)] = arrayVal
            .filter(id => id)
            .map(id => this.source.makeUid(id))
          return refs
        }, {})
      };

      this.source.addNode(item.itemType.name, node)
    }
  }
}

module.exports = DatoCmsSource
