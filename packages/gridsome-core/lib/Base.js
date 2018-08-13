const EventEmitter = require('events')

class Base extends EventEmitter {
  static defaultOptions () {
    return {}
  }

  constructor (service, options, plugin) {
    super()

    this.service = service
    this.context = service.context
    this.resolve = service.resolve
    this.options = options
    this.plugin = plugin
  }

  apply () {}
}

module.exports = Base
