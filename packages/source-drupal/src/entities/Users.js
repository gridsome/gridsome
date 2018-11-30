const Entity = require('./Entity')

class Users extends Entity {
  constructor(source, config) {
    // config == { entityType, entityName, type, url }
    super(source, config)
  }

  async initialize() {
    try {
      console.log('Intializing Users...')

      await this.fetchData()
      await this.buildGraphQl()

      console.log('Users initialzed...')
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
          changed,
          ...fields
        } = {},
        relationships
      } = item

      const relationshipFields = this.processRelationships(relationships)

      // loading in KNOWN additional fields
      const customFields = {
        name,
        created,
        changed
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
        title: name,
        date: created,
        fields: {
          ...customFields,
          ...relationshipFields
        }
      })
    }
  }
}

module.exports = Users
