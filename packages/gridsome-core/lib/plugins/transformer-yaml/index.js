const yaml = require('js-yaml')

module.exports = (api) => {
  api.client(false)

  api.addTransformer('text/yaml', {
    parse (string) {
      return yaml.safeLoad(string, { schema: yaml.JSON_SCHEMA, json: true }) || {}
    },
    stringify (data) {
      return data ? yaml.safeDump(data) : ''
    }
  })
}
