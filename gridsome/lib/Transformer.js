const Base = require('./Base')

class Transformer extends Base {
  static mimeTypes () {
    return []
  }

  parse (string, options) {
    return {
      title: '',
      content: '',
      excerpt: '',
      fields: {}
    }
  }
}

module.exports = Transformer
