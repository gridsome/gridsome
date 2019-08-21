const path = require('path')
const fs = require('fs-extra')

function corePlugin (api, config) {
  api.loadSource(store => {
    store.addMetadata('siteName', config.siteName)
    store.addMetadata('siteDescription', config.siteDescription)
    store.addMetadata('siteUrl', config.siteUrl)
    store.addMetadata('pathPrefix', config.pathPrefix)

    for (const key in config.metadata) {
      store.addMetadata(key, config.metadata[key])
    }
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
