const path = require('path')
const EventEmitter = require('events')

class Base extends EventEmitter {
  static defaultOptions () {
    return {}
  }

  constructor (context, options) {
    super()

    this.context = context
    this.options = options
  }

  resolve (p) {
    return path.resolve(this.context, p)
  }

  onBefore () {}
  onAfter () {}

  apply () {}
}

module.exports = Base
