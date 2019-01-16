const jsYaml = require('js-yaml')

class YamlTransformer {
  static mimeTypes () {
    return ['text/yaml']
  }

  parse (content, options) {
    const yaml = jsYaml.load(content)

    let fields = {}
    if (Array.isArray(yaml)) {
      fields = { data: yaml }
    } else {
      fields = yaml
    }

    return { fields }
  }
}

module.exports = YamlTransformer
