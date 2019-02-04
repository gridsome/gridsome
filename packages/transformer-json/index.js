const parseJson = require('json-parse-better-errors')

class JSONTransformer {
  static mimeTypes () {
    return ['application/json']
  }

  parse (source) {
    const data = parseJson(source)

    const fields = typeof data !== 'object' || Array.isArray(data)
      ? { data }
      : data

    return { fields }
  }
}

module.exports = JSONTransformer
