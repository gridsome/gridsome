const jsYaml = require('js-yaml')

class YamlTransformer {
  static mimeTypes () {
    return ['text/yaml']
  }

  parse (content, options) {
    const yaml = jsYaml.load(content)

    return {
      fields: {
        yaml
      }
    }
  }
}

module.exports = YamlTransformer
