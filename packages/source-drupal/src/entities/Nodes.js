const {} = require('../utils')
const Entity = require('./Entity')

class Nodes extends Entity {
  constructor(source, config) {
    // config == { entityType, entityName, type, url }
    super(source, config)
  }

  async initialize() {
    try {
      console.log('Intializing ContentTypes...')

      await this.fetchData()
      await this.buildGraphQl()

      console.log('ContentTypes initialzed...')
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
          title,
          name,
          created,
          body: {
            processed,
            value,
            summary
          } = {},
          body = '',
          ...fields // TODO: certain drupal custom field types might return as objects
        } = {},
        relationships
      } = item

      const relationshipFields = this.processRelationships(relationships)

      const customFields = {}

      for (let key in fields) {
        if (key.includes('field_')) {
          customFields[key] = (fields[key] === null)
            ? ''
            : fields[key]
        }
      }

      this.graphQlContentType.addNode({
        id,
        title: title || name,
        date: created,
        excerpt: summary,
        content: processed || value || body,
        fields: {
          ...customFields,
          ...relationshipFields
        }
      })
    }
  }
}

module.exports = Nodes