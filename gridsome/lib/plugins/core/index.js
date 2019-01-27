function corePlugin (api, options) {
  api.loadSource(store => {
    store.addMetaData('siteName', options.siteName)
    store.addMetaData('siteUrl', options.siteUrl)
    store.addMetaData('baseUrl', options.baseUrl)
  })
}

module.exports = corePlugin
