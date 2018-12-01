const Entity = require('./Entity')

class TaxonomyTypes extends Entity {
  constructor(source, type, url) {
    // config == { entityType, entityName, type, url }
    super(source, type, url)
  }
  
  // override Entity methods here
}

module.exports = TaxonomyTypes
