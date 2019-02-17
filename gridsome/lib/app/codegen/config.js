function genConfig ({ config }) {
  const { version } = require('../../../package.json')
  const { siteUrl, siteName, titleTemplate, siteDescription } = config

  return `export default ${JSON.stringify({
    siteUrl,
    siteName,
    titleTemplate,
    siteDescription,
    version
  }, null, 2)}`
}

module.exports = genConfig
