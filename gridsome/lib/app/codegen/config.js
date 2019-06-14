function genConfig ({ config, store }) {
  const { version } = require('../../../package.json')
  const { siteUrl, siteName, titleTemplate, siteDescription } = config
  const storeMetaData = {}

  for (const metaData in store.metaData.data) {
    const { key, data } = store.metaData.data[metaData]
    storeMetaData[key] = data
  }

  return `export default ${JSON.stringify({
    siteUrl,
    siteName,
    titleTemplate,
    siteDescription,
    version,
    ...storeMetaData
  }, null, 2)}`
}

module.exports = genConfig
