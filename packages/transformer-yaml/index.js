const jsYaml = require('js-yaml')

class YamlTransformer {
  static mimeTypes () {
    return ['text/yaml']
  }

  parse (content) {
    const data = jsYaml.load(content)

    return typeof data !== 'object' || Array.isArray(data)
      ? { data }
      : data
  }
}

module.exports = YamlTransformer
