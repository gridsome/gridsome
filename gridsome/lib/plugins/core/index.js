const path = require('path')
const fs = require('fs-extra')

function corePlugin (api, config) {
  api.loadSource(store => {
    store.addMetaData('siteName', config.siteName)
    store.addMetaData('siteDescription', config.siteDescription)
    store.addMetaData('siteUrl', config.siteUrl)
    store.addMetaData('baseUrl', config.baseUrl)
  })

  api.afterBuild(({ queue, config }) => {
    const notFoundPath = path.join(config.outDir, '404', 'index.html')
    const notFoundDest = path.join(config.outDir, '404.html')

    if (fs.existsSync(notFoundPath)) {
      fs.copySync(notFoundPath, notFoundDest)
    }
  })
}

module.exports = corePlugin
