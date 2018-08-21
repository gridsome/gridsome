const pMap = require('p-map')
const Source = require('../Source')
const EventEmitter = require('events')
const { defaultsDeep } = require('lodash')
const { NORMAL_PLUGIN, SOURCE_PLUGIN, internalRE } = require('./index')

class Plugins extends EventEmitter {
  constructor (service) {
    super()

    this.plugins = service.config.plugins.map(entry => {
      const use = entry.use.replace(internalRE, '../')
      const PluginClass = require(use)
      const defaults = PluginClass.defaultOptions()
      const options = defaultsDeep(entry.options, defaults)
      const { context, store, transformers } = service

      const args = {
        context: service.context,
        store: service.store,
        events: service.events
      }

      switch (entry.type) {
        case NORMAL_PLUGIN:
          return { entry, plugin: new PluginClass(options, args) }

        case SOURCE_PLUGIN:
          if (!options.typeName) {
            throw new Error(`${use} is missing the typeName option.`)
          }

          const source = new Source(context, store, options.typeName, transformers)

          return { entry, source, plugin: new PluginClass(options, source, args) }
      }
    })
  }

  run () {
    return pMap(this.plugins, async ({ entry, plugin, source }) => {
      switch (entry.type) {
        case NORMAL_PLUGIN:
          return plugin.apply()

        case SOURCE_PLUGIN:
          return this.runSourcePlugin(plugin, source)
      }
    }, { concurrency: 3 })
  }

  async callHook (name, ...args) {
    const results = await pMap(this.plugins, ({ plugin }) => {
      return this.callMethod(plugin, name, args)
    })

    return results.filter(value => !!value)
  }

  callHookSync (name, ...args) {
    const results = this.plugins.map(({ plugin }) => {
      return this.callMethod(plugin, name, args)
    })

    return results.filter(value => !!value)
  }

  callMethod (plugin, name, args) {
    return typeof plugin[name] === 'function'
      ? plugin[name](...args)
      : null
  }

  async runSourcePlugin (plugin, source) {
    await plugin.apply()

    source.setupReversedReferences()

    if (process.env.NODE_ENV === 'development') {
      let regenerateTimeout = null

      // use timeout as a workaround for when files are renamed,
      // which triggers both addPage and removePage events...
      const regenerateRoutes = () => {
        clearTimeout(regenerateTimeout)
        regenerateTimeout = setTimeout(() => {
          this.emit('generateRoutes')
        }, 20)
      }

      source.on('removePage', regenerateRoutes)
      source.on('addPage', regenerateRoutes)

      source.on('updatePage', async (page, oldPage) => {
        const { pageQuery: { paginate: oldPaginate }} = oldPage
        const { pageQuery: { paginate }} = page

        // regenerate route.js whenever paging options changes
        if (paginate.collection !== oldPaginate.collection) {
          return regenerateRoutes()
        }

        // send query to front-end for re-fetch
        this.emit('broadcast', {
          query: page.pageQuery.content,
          file: page.file
        })
      })
    }
  }
}

module.exports = Plugins
