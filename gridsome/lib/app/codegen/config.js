function genConfig ({ config }) {
  const { version } = require('../../../package.json')
  const { siteUrl, siteName, titleTemplate, siteDescription, permalinks } = config

  return `export default ${JSON.stringify({
    siteUrl,
    siteName,
    titleTemplate,
    siteDescription,
    trailingSlash: permalinks.trailingSlash,
    version
  }, null, 2)}`
}

module.exports = genConfig
