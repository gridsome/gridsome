const Base = require('./Base')

class Plugin extends Base {
  constructor (service, options, plugin) {
    super(service, options)

    this.plugin = plugin
  }
}

module.exports = Plugin
