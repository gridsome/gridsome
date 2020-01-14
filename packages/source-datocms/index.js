const { SiteClient, Loader } = require('datocms-client')
const camelcase = require('camelcase')
const decamelize = require('decamelize')
const ImgixClient = require('imgix-core-js')
const imgixParams = require('imgix-url-params/dist/parameters')

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
    const imageStore = store.addCollection('DatoCmsImage')
    const markdownStore = store.addCollection('DatoCmsContentMarkdown')

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

      const markdownFields = itemType.fields.filter(({ fieldType, appeareance }) => fieldType === 'text' && appeareance.type === 'markdown').map(field => {
        const apiKey = camelcase(field.apiKey)
        collection.addReference(apiKey, 'DatoCmsContentMarkdown')
        return apiKey
      })

      const cachePayload = {
        typeName,
        imageFields,
        markdownFields,
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
        path: upload.path,
        blurhash: upload.blurhash,
        ...metadata
      }
      imageStore.addNode(image)
    }

    for (const [id, item] of Object.entries(items)) {
      const { typeName, imageFields, markdownFields, slugField, seoField } = cache.get(item.itemType.id)
      const collection = store.getCollection(typeName)

      const itemImageFields = imageFields.flatMap(imageField => {
        const itemImageField = item[imageField]
        if (!itemImageField) return {}
        return { [imageField]: itemImageField.uploadId }
      }).reduce((obj, field) => ({ ...obj, ...field }), {})

      const itemFields = Object.entries(item.payload.attributes).reduce((obj, [key, value]) => ({ ...obj, [camelcase(key)]: value }), {})

      const itemMarkdownFields = markdownFields.flatMap(richFieldKey => {
        const itemMarkdownField = item[richFieldKey]
        if (!itemMarkdownField) return {}
        const markdownNode = markdownStore.addNode({
          internal: {
            mimeType: 'text/markdown',
            content: itemMarkdownField,
            origin: id
          }
        })
        return { [richFieldKey]: markdownNode.id }
      }).reduce((obj, field) => ({ ...obj, ...field }), {})

      const itemNode = {
        id,
        ...itemFields,
        ...itemImageFields,
        ...itemMarkdownFields,
        slug: slugField && itemFields[slugField],
        seo: seoField && itemFields[seoField],
        createdAt: new Date(itemFields.createdAt),
        updatedAt: new Date(itemFields.updatedAt)
      }

      collection.addNode(itemNode)
    }
  }

  async extendSchema ({ addSchemaTypes, schema, addSchemaResolvers }) {
    const graphQLTypes = new Map([
      ['integer', 'Int'],
      ['number', 'Float'],
      ['string', 'String']
    ])
    const inputTypes = []
    const imgixArgs = Object.entries(imgixParams.parameters).map(([param, info]) => {
      const { expects, short_description: description, url, available_in: available } = info
      if (!available.includes('url')) return
      if (expects.find(({ type }) => type === 'list')) return

      const [{ type }] = expects
      const name = camelcase(param)
      const inputType = graphQLTypes.get(type) || 'String'

      return { [name]: { type: inputType, description: `${description} ${url}` }}

      // const inputTypeNames = expects.map(({ type, ...args }) => {
      //   const graphQLType = graphQLTypes.get(type)
      //   if (graphQLType) return { name: type, type: graphQLType }
      //   if (type !== 'list') {
      //     if (expects.length > 1) {
      //       const [{ type: insideType }] = expects
      //       const graphQLType = graphQLTypes.get(insideType)
      //       return { name: type, type: graphQLType || 'String' }
      //     }
      //     return { name: type, type: 'String' }
      //   }

      //   if (args.possible_values) {
      //     const inputName = camelcase(`${name}Enum`, { pascalCase: true })
      //     const values = args.possible_values.reduce((obj, value) => ({ ...obj, [camelcase(value).toUpperCase()]: { value }}), {})
      //     const inputType = schema.createEnumType({
      //       name: inputName,
      //       values
      //     })
      //     inputTypes.push(inputType)
      //     return { name, type: name === 'auto' ? `[${inputName}]` : inputName }
      //   }

      //   return
      //   // const { length, ...argValues } = args
      //   // const inputName = `${name}${length}Input`
      //   // const fields = Object.entries(argValues).reduce((obj, [key, [{ type }]]) => ({ ...obj, [key]: graphQLTypes.get(type) || 'String' }), {})
      //   // console.log(fields)
      //   // const inputType = schema.createInputType({
      //   //   name: inputName,
      //   //   fields
      //   // })
      //   // inputTypes.push(inputType)
      //   // return { name, type: inputName }
      // }).filter(obj => !!obj)

      // if (!inputTypeNames.length) return

      // if (inputTypeNames.length === 1) {
      //   const [{ type }] = inputTypeNames
      //   return { [name]: { type, description: `${description} ${url}` }}
      // }

      // const inputName = `${name}Input`
      // const inputFields = inputTypeNames.reduce((obj, { name, type }) => ({ ...obj, [name]: type }), {})
      // const inputObject = schema.createInputType({
      //   name: inputName,
      //   fields: inputFields
      // })
      // inputTypes.push(inputObject)
      // return { [name]: { type: inputName, description: `${description} ${url}` }}
    }).reduce((obj, arg) => ({ ...obj, ...arg }), {})

    addSchemaTypes([
      ...inputTypes,
      schema.createObjectType({
        name: 'DatoCmsImage',
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
      DatoCmsImage: {
        transformUrl: {
          args: imgixArgs,
          resolve: ({ path }, args) => {
            const transformParams = Object.entries(args).reduce((obj, [param, value]) => ({ ...obj, [decamelize(param, '-')]: value }), {})
            const client = new ImgixClient({ domain: 'www.datocms-assets.com', includeLibraryParam: false, useHTTPS: true })
            return client.buildURL(path, transformParams)
          }
        },
        srcSet: {
          args: imgixArgs,
          resolve: ({ path }, args) => {
            const transformParams = Object.entries(args).reduce((obj, [param, value]) => ({ ...obj, [decamelize(param, '-')]: value }), {})
            const client = new ImgixClient({ domain: 'www.datocms-assets.com', includeLibraryParam: false, useHTTPS: true })
            return client.buildSrcSet(path, transformParams)
          }
        }
      }
    })
  }
}

module.exports = DatoCmsSource
