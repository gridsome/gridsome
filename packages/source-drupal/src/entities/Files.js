const {} = require('../utils')
const Entity = require('./Entity')

class Files extends Entity {
  constructor(source, type, url) {
    super(source, type, url)

    this.entityType = 'file'
  }

  async initialize() {
    try {
      console.log('Intializing Files...')

      await this.fetchData()
      await this.buildGraphQl()

      console.log('Files initialzed...')
    } catch ({ message }) {
      throw new Error(message)
    }
  }

  async buildGraphQl() {
    let { store } = this.source
    let { addContentType } = store

    const config = this.createGraphQlType()
    this.graphQlContentType = addContentType(config)

    for (let item of this.response) {
      let {
        id,
        attributes: {
          filename,
          uri = {},
          url,
          created,
          changed,
          filesize,
          filemime,
          ...fields
        } = {},
        relationships
      } = item

      const relationshipFields = this.processRelationships(relationships)

      // loading in KNOWN additional fields
      const customFields = {
        filename,
        url,
        created,
        changed,
        filesize,
        filemime
      }

      // aything prefixed with field_ is a custom field 
      // set by the user in drupal
      for (let key in fields) {
        if (key.includes('field_')) {
          customFields[key] = (fields[key] === null)
            ? ''
            : fields[key]
        }
      }

      this.graphQlContentType.addNode({
        id,
        title: filename,
        date: created,
        fields: {
          ...customFields,
          ...relationshipFields
        }
      })
    }
  }
}

module.exports = Files
