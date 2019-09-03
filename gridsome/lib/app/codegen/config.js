function genConfig ({ config }) {
  const { version } = require('../../../package.json')
  const { permalinks, titleTemplate, siteUrl } = config

  return `export default ${JSON.stringify({
    trailingSlash: permalinks.trailingSlash,
    titleTemplate,
    siteUrl,
    version
  }, null, 2)}`
}

module.exports = genConfig
