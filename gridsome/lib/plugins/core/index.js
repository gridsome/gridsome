const path = require('path')
const fs = require('fs-extra')

function corePlugin (api, config) {
  api.loadSource(store => {
    store.addMetaData('siteName', config.siteName)
    store.addMetaData('siteDescription', config.siteDescription)
    store.addMetaData('siteUrl', config.siteUrl)
    store.addMetaData('pathPrefix', config.pathPrefix)

    for (const key in config.metaData) {
      store.addMetaData(key, config.metaData[key])
    }
  })

  api.afterBuild(({ config }) => {
    const notFoundPath = path.join(config.outDir, '404', 'index.html')
    const notFoundDest = path.join(config.outDir, '404.html')

    if (fs.existsSync(notFoundPath)) {
      fs.copySync(notFoundPath, notFoundDest)
    }
  })
}

module.exports = corePlugin
