const { SiteClient, Loader } = require('datocms-client')
const camelcase = require('camelcase')

class DatoCmsSource {
  static defaultOptions () {
    return {
      typeName: 'DatoCms',
      apiToken: undefined,
      previewMode: false,
      apiUrl: 'https://site-api.datocms.com'
    }
  }

  constructor (api, options) {
    this.options = options
    api.loadSource(store => this.fetchContent(store))
  }

  createTypeName (name) {
    return camelcase(`${this.options.typeName} ${name}`, { pascalCase: true })
  }

  async fetchContent (store) {
    const { apiToken, apiUrl, previewMode } = this.options
    if (!apiToken) throw new Error('Missing API Token (`apiToken`)')

    const clientHeaders = {
      'X-Reason': 'dump',
      'X-SSG': 'gridsome'
    }

    const loaderClient = apiUrl
      ? new SiteClient(apiToken, clientHeaders, apiUrl)
      : new SiteClient(apiToken, clientHeaders)

    const loader = new Loader(loaderClient, previewMode)
    await loader.load()

    const { upload: uploads, item: items, item_type: itemTypes } = loader.entitiesRepo.entities

    const cache = new Map()
    const imageStore = store.addCollection('DatoCmsImage')

    for (const [id, itemType] of Object.entries(itemTypes)) {
      const typeName = this.createTypeName(itemType.name)
      const collection = store.addCollection(typeName)

      const slugField = itemType.fields.find(({ fieldType }) => fieldType === 'slug')
      const seoField = itemType.fields.find(({ fieldType }) => fieldType === 'seo')

      const imageFields = itemType.fields.filter(({ fieldType }) => fieldType === 'file').map(field => {
        const apiKey = camelcase(field.apiKey)
        collection.addReference(apiKey, 'DatoCmsImage')
        return apiKey
      })

      const cachePayload = {
        typeName,
        imageFields,
        slugField: slugField && slugField.apiKey,
        seoField: seoField && seoField.apiKey
      }
      cache.set(id, cachePayload)
    }

    for (const [id, upload] of Object.entries(uploads)) {
      if (!upload.isImage) return
      const metadata = upload.defaultFieldMetadata.en
      const image = {
        id,
        width: upload.width,
        height: upload.height,
        format: upload.format,
        url: upload.url,
        blurhash: upload.blurhash,
        ...metadata
      }
      imageStore.addNode(image)
    }

    for (const [id, item] of Object.entries(items)) {
      const { typeName, imageFields, slugField, seoField } = cache.get(item.itemType.id)
      const collection = store.getCollection(typeName)

      const itemImageFields = imageFields.flatMap(imageField => {
        const itemImageField = item[imageField]
        if (!itemImageField) return {}
        return { [imageField]: itemImageField.uploadId }
      }).reduce((obj, field) => ({ ...obj, ...field }), {})

      const itemFields = Object.entries(item.payload.attributes).reduce((obj, [key, value]) => ({ ...obj, [camelcase(key)]: value }), {})

      const itemNode = {
        id,
        ...itemFields,
        ...itemImageFields,
        slug: slugField && itemFields[slugField],
        seo: seoField && itemFields[seoField],
        createdAt: new Date(itemFields.createdAt),
        updatedAt: new Date(itemFields.updatedAt)
      }
      // console.log(itemNode)

      collection.addNode(itemNode)
    }
  }
}

module.exports = DatoCmsSource
