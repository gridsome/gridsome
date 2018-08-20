const pMap = require('p-map')
const Source = require('../Source')
const { defaultsDeep } = require('lodash')
const { NORMAL_PLUGIN, SOURCE_PLUGIN, internalRE } = require('./index')

module.exports = service => {
  return pMap(service.config.plugins, async plugin => {
    const use = plugin.use.replace(internalRE, '../')
    const PluginClass = require(use)
    const defaults = PluginClass.defaultOptions()
    const options = defaultsDeep(plugin.options, defaults)

    switch (plugin.type) {
      case NORMAL_PLUGIN:
        return runPlugin(PluginClass, options, service, use)

      case SOURCE_PLUGIN:
        return runSourcePlugin(PluginClass, options, service, use)
    }
  }, { concurrency: 3 })
}

async function runSourcePlugin (PluginClass, options, service, id) {
  const { context, store, transformers } = service

  if (!options.typeName) {
    throw new Error(`${id} is missing a typeName option.`)
  }

  const source = new Source(context, store, options.typeName, transformers)
  const plugin = new PluginClass(options, source, { context })

  await plugin.apply()

  source.setupReversedReferences()

  if (process.env.NODE_ENV === 'development') {
    let regenerateTimeout = null

    // use timeout as a workaround for when files are renamed,
    // which triggers both add and unlink events...
    const regenerateRoutes = () => {
      clearTimeout(regenerateTimeout)
      regenerateTimeout = setTimeout(() => {
        service.generateRoutes()
      }, 20)
    }

    source.on('removePage', regenerateRoutes)
    source.on('addPage', regenerateRoutes)

    source.on('updatePage', async (page, oldPage) => {
      const { pageQuery: { paginate: oldPaginate }} = oldPage
      const { pageQuery: { paginate }} = page

      // regenerate route.js whenever paging options changes
      if (paginate.collection !== oldPaginate.collection) {
        await service.generateRoutes()
      }

      // send query to front-end for re-fetch
      service.broadcast({
        query: page.pageQuery.content,
        file: page.file
      })
    })
  }

  return plugin
}

async function runPlugin (PluginClass, options, { context }) {
  const plugin = new PluginClass(options, { context })

  await plugin.apply()

  return plugin
}

