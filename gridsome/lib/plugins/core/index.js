const path = require('path')
const fs = require('fs-extra')

const {
  NOT_FOUND_PATH,
  NOT_FOUND_NAME
} = require('../../utils/constants')

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

  api.createPages(({ createPage }) => {
    createPage({
      name: NOT_FOUND_NAME,
      path: NOT_FOUND_PATH,
      component: path.join(config.appPath, 'pages', '404.vue')
    })
  })

  api.afterBuild(({ config }) => {
    const notFoundPath = path.join(config.outDir, '404', 'index.html')
    const notFoundDest = path.join(config.outDir, '404.html')

    if (fs.existsSync(notFoundPath)) {
      fs.copySync(notFoundPath, notFoundDest)
    }
  })

  api._app.pages.hooks.createRoute.tap('Gridsome', options => {
    if (options.path === NOT_FOUND_PATH) {
      options.name = NOT_FOUND_NAME
    }

    return options
  })
}

module.exports = corePlugin
