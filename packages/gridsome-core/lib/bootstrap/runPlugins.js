const pMap = require('p-map')
const { internalRE } = require('./index')
const { defaultsDeep } = require('lodash')
const createRouterData = require('./createRouterData')
const { SOURCE_PLUGIN } = require('../utils/enums')

module.exports = service => {
  return pMap(service.config.plugins, async plugin => {
    const use = plugin.use.replace(internalRE, '../')
    const Constructor = require(use)
    const defaults = Constructor.defaultOptions()
    const options = defaultsDeep(plugin.options, defaults)

    plugin.instance = new Constructor(service, options, plugin)

    plugin.instance.onBefore()
    await plugin.instance.apply()
    plugin.instance.onAfter()

    if (process.env.NODE_ENV === 'development' && plugin.type === SOURCE_PLUGIN) {
      plugin.instance.on('addPage', page => generateRoutes(service))
      plugin.instance.on('removePage', () => generateRoutes(service))

      plugin.instance.on('updatePage', async (page, oldPage) => {
        const { pageQuery: { paginate: oldPaginate }} = oldPage
        const { pageQuery: { paginate }} = page

        // regenerate route.js whenever paging options changes
        if (paginate.collection !== oldPaginate.collection) {
          await generateRoutes(service)
        }

        // send query to front-end for re-fetch
        service.broadcast({
          query: page.pageQuery.content,
          file: page.file
        })
      })
    }
  }, { concurrency: 3 })
}

async function generateRoutes (service) {
  createRouterData(service)
  await service.generate('routes.js')
  await service.generate('now.js')
}
