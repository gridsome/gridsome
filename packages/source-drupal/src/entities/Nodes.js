const Entity = require('./Entity')

class Nodes extends Entity {
  constructor(source, config) {
    // config == { entityType, entityName, type, url }
    super(source, config)
  }

  // override Entity methods here
}

module.exports = Nodes