const jsYaml = require('js-yaml')

class YamlTransformer {
  static mimeTypes () {
    return ['text/yaml']
  }

  parse (content) {
    const data = jsYaml.load(content)

    const fields = typeof data !== 'object' || Array.isArray(data)
      ? { data }
      : data

    return { fields }
  }
}

module.exports = YamlTransformer
