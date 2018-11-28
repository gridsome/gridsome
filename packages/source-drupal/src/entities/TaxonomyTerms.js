const Entity = require('./Entity')

class TaxonomyTypes extends Entity {
  constructor(source, type, url) {
    // config == { entityType, entityName, type, url }
    super(source, type, url)
  }

  async initialize() {
    try {
      console.log('Intializing TaxonomyTypes...')

      await this.fetchData()
      await this.buildGraphQl()

      console.log('TaxonomyTypes initialzed...')
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
          name,
          created,
          description: {
            processed,
            value
          } = {},
          description = '',
          weight,
          ...fields // TODO: certain drupal custom field types might return as objects
        } = {},
        relationships,
      } = item

      const relationshipFields = this.processRelationships(relationships)

      const customFields = { weight }

      for (let key in fields) {
        if (key.includes('field_')) {
          customFields[key] = (fields[key] === null)
            ? ''
            : fields[key]
        }
      }

      this.graphQlContentType.addNode({
        id,
        title: name,
        content: processed || value || description,
        fields: {
          ...customFields,
          ...relationshipFields
        }
      })
    }
  }
}

module.exports = TaxonomyTypes
