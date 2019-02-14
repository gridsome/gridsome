class JSONTransformer {
  static mimeTypes () {
    return ['application/json']
  }

  parse (content) {
    return {
      fields: JSON.parse(content)
    }
  }
}

module.exports = JSONTransformer
