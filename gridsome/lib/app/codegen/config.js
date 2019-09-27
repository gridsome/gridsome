function genConfig ({ config }) {
  const { version } = require('../../../package.json')
  const { permalinks, titleTemplate, _pathPrefix, siteUrl } = config

  return `export default ${JSON.stringify({
    trailingSlash: permalinks.trailingSlash,
    pathPrefix: _pathPrefix,
    titleTemplate,
    siteUrl,
    version
  }, null, 2)}`
}

module.exports = genConfig
