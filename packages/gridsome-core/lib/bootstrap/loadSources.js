const SourceAPI = require('../SourceAPI')

module.exports = async service => {
  service.sources = []

  for (const plugin of service.plugins) {
    if (typeof plugin.api.initSource === 'function') {
      const source = new SourceAPI(service, plugin)
      await plugin.api.initSource(source)

      source.on('addPage', page => generateRoutes(service))
      source.on('removePage', () => generateRoutes(service))

      source.on('updatePage', async (page, oldPage) => {
        const { pageQuery: { paginate: oldPaginate }} = oldPage
        const { pageQuery: { paginate }} = page

        // regenerate route.js whenever paging options changes
        if (paginate.collection !== oldPaginate.collection) {
          await generateRoutes(service)
        }
      })

      service.sources.push({ plugin, source })
    }
  }
}

async function generateRoutes (service) {
  await service.bootstrapRouter()
  await service.generate('routes.js')
  await service.generate('now.js')
}
