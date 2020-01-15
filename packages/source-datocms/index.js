const { SiteClient, Loader } = require('datocms-client')
const camelcase = require('camelcase')
const decamelize = require('decamelize')
const ImgixClient = require('imgix-core-js')
const imgixParams = require('imgix-url-params/dist/parameters')

const IMAGE_TYPENAME = 'DatoCmsImage'
const ASSET_TYPENAME = 'DatoCmsAsset'
const MARKDOWN_TYPENAME = 'DatoCmsContentMarkdown'

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
    api.loadSource(schema => this.extendSchema(schema))
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
    const imageStore = store.addCollection(IMAGE_TYPENAME)
    const assetStore = store.addCollection(ASSET_TYPENAME)
    const markdownStore = store.addCollection(MARKDOWN_TYPENAME)

    for (const [id, itemType] of Object.entries(itemTypes)) {
      const typeName = this.createTypeName(itemType.name)
      const collection = store.addCollection(typeName)

      const slugField = itemType.fields.find(({ fieldType }) => fieldType === 'slug')
      const seoField = itemType.fields.find(({ fieldType }) => fieldType === 'seo')

      const imageFields = itemType.fields.filter(({ fieldType }) => ['file', 'gallery'].includes(fieldType)).map(field => {
        const apiKey = camelcase(field.apiKey)
        collection.addReference(apiKey, IMAGE_TYPENAME)
        return apiKey
      })

      const markdownFields = itemType.fields.filter(({ fieldType, appeareance }) => fieldType === 'text' && appeareance.type === 'markdown').map(field => {
        const apiKey = camelcase(field.apiKey)
        collection.addReference(apiKey, MARKDOWN_TYPENAME)
        return apiKey
      })

      itemType.fields.filter(({ fieldType }) => ['link', 'links', 'rich_text'].includes(fieldType)).forEach(field => {
        const apiKey = camelcase(field.apiKey)
        const typeNames = (field.validators.itemItemType || field.validators.itemsItemType || field.validators.richTextBlocks).itemTypes.map(id => this.createTypeName(itemTypes[id].name))
        collection.addReference(apiKey, { typeName: typeNames.length > 1 ? typeNames : typeNames[0] })
      })

      cache.set(id, {
        typeName,
        imageFields,
        markdownFields,
        slugField: slugField && slugField.apiKey,
        seoField: seoField && seoField.apiKey
      })
    }

    for (const [id, upload] of Object.entries(uploads)) {
      if (upload.isImage) {
        const metadata = upload.defaultFieldMetadata.en
        const image = {
          id,
          width: upload.width,
          height: upload.height,
          format: upload.format,
          url: upload.url,
          path: upload.path,
          blurhash: upload.blurhash,
          ...metadata
        }
        imageStore.addNode(image)
      } else assetStore.addNode({ id, ...upload })
    }

    for (const [id, item] of Object.entries(items)) {
      const { typeName, imageFields, markdownFields, slugField, seoField } = cache.get(item.itemType.id)
      const collection = store.getCollection(typeName)

      const itemNode = { id }

      for (let [key, value] of Object.entries(item.payload.attributes)) {
        key = camelcase(key)

        if (key === slugField) key = 'slug'
        if (key === seoField) key = 'seo'

        if (['created_at', 'updated_at'].includes(key)) value = new Date(value)

        itemNode[key] = value
      }

      for (const imageField of imageFields) {
        const itemImageField = item[imageField]
        if (itemImageField) {
          itemNode[imageField] = Array.isArray(itemImageField) ? itemImageField.map(({ uploadId }) => uploadId) : itemImageField.uploadId
        }
      }

      for (const markdownFieldKey of markdownFields) {
        const itemMarkdownField = item[markdownFieldKey]
        if (itemMarkdownField) {
          const markdownNode = markdownStore.addNode({
            internal: {
              mimeType: 'text/markdown',
              content: itemMarkdownField,
              origin: id
            }
          })

          itemNode[markdownFieldKey] = store.createReference(markdownNode)
        }
      }

      collection.addNode(itemNode)
    }
  }

  async extendSchema ({ addSchemaTypes, schema, addSchemaResolvers }) {
    const client = new ImgixClient({ domain: 'www.datocms-assets.com', includeLibraryParam: false, useHTTPS: true })

    const mappings = {
      boolean: 'Boolean',
      hex_color: 'String',
      integer: 'Int',
      list: 'String',
      number: 'Float',
      path: 'String',
      string: 'String',
      timestamp: 'String',
      unit_scalar: 'Float',
      font: 'String',
      ratio: 'String',
      url: 'String'
    }

    const imgixParamsFields = {}
    for (const [param, doc] of Object.entries(imgixParams.parameters)) {
      let type = 'String'

      if (mappings[doc.expects[0].type]) {
        type = mappings[doc.expects[0].type]
      }

      imgixParamsFields[camelcase(param)] = {
        type,
        description: `${doc.short_description} (${doc.url})`
      }
    }

    const transformParams = args => Object.entries(args).reduce((obj, [param, value]) => ({ ...obj, [decamelize(param, '-')]: value }), {})

    addSchemaTypes([
      schema.createInputType({
        name: `DatoCmsImgixParams`,
        fields: imgixParamsFields
      }),
      schema.createObjectType({
        name: IMAGE_TYPENAME,
        interfaces: ['Node'],
        description: 'A custom Image type that lets you create transform URLs using the DatoCMS Image CDN.',
        fields: {
          url: 'String!',
          width: 'Int!',
          height: 'Int!',
          blurhash: 'String!',
          alt: 'String',
          transformUrl: 'String!',
          srcSet: 'String!'
        }
      })
    ])

    addSchemaResolvers({
      [IMAGE_TYPENAME]: {
        transformUrl: {
          args: { imgixParams: 'DatoCmsImgixParams' },
          resolve: ({ path }, { imgixParams }) => client.buildURL(path, transformParams(imgixParams))
        },
        srcSet: {
          args: { imgixParams: 'DatoCmsImgixParams' },
          resolve: ({ path }, { imgixParams }) => client.buildSrcSet(path, transformParams(imgixParams))
        }
      }
    })
  }
}

module.exports = DatoCmsSource
