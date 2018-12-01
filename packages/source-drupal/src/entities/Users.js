const Entity = require('./Entity')

class Users extends Entity {
  constructor(source, config) {
    // config == { entityType, entityName, type, url }
    super(source, config)
  }

  // override Entity methods here
}

module.exports = Users
