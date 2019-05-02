const parseJson = require('json-parse-better-errors')

class JSONTransformer {
  static mimeTypes () {
    return ['application/json']
  }

  parse (source) {
    const data = parseJson(source)

    return typeof data !== 'object' || Array.isArray(data)
      ? { data }
      : data
  }
}

module.exports = JSONTransformer
