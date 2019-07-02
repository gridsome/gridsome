function genConfig ({ config }) {
  const { version } = require('../../../package.json')
  const { titleTemplate, siteUrl } = config

  return `export default ${JSON.stringify({
    titleTemplate,
    siteUrl,
    version
  }, null, 2)}`
}

module.exports = genConfig
