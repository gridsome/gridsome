const EventEmitter = require('events')
const PluginAPI = require('./PluginAPI')
const { defaultsDeep } = require('lodash')

class Plugins extends EventEmitter {
  constructor (app) {
    super()

    this.plugins = []

    app.config.plugins.map(entry => {
      const Plugin = entry.entries.serverEntry
        ? require(entry.entries.serverEntry)
        : null

      if (typeof Plugin !== 'function') return
      if (!Plugin.prototype) return

      const defaults = typeof Plugin.defaultOptions === 'function'
        ? Plugin.defaultOptions()
        : {}

      entry.options = defaultsDeep(entry.options, defaults)

      const { context } = app
      const api = new PluginAPI(app, { entry })
      const instance = new Plugin(api, entry.options, { context })

      this.plugins.push({ api, entry, instance })
    })
  }

  // TODO: re-implement this
  // run () {
  //   return pMap(this.plugins, async ({ instance, source }) => {
  //     await instance.apply()

  //     if (process.env.NODE_ENV === 'development') {
  //       let regenerateTimeout = null

  //       // use timeout as a workaround for when files are renamed,
  //       // which triggers both addPage and removePage events...
  //       const regenerateRoutes = () => {
  //         clearTimeout(regenerateTimeout)
  //         regenerateTimeout = setTimeout(() => {
  //           this.emit('generateRoutes')
  //         }, 20)
  //       }

  //       source.on('removePage', regenerateRoutes)
  //       source.on('addPage', regenerateRoutes)

  //       source.on('change', (node, oldNode = node) => {
  //         if (
  //           (node && node.withPath && node.path !== oldNode.path) ||
  //           (!node && oldNode.withPath)
  //         ) {
  //           return regenerateRoutes()
  //         }

  //         this.emit('broadcast', {
  //           type: 'updateAllQueries'
  //         })
  //       })

  //       source.on('updatePage', async (page, oldPage) => {
  //         const { pageQuery: { paginate: oldPaginate }} = oldPage
  //         const { pageQuery: { paginate }} = page

  //         // regenerate route.js whenever paging options changes
  //         if (paginate.collection !== oldPaginate.collection) {
  //           return regenerateRoutes()
  //         }

  //         // send query to front-end for re-fetch
  //         this.emit('broadcast', {
  //           type: 'updateQuery',
  //           query: page.pageQuery.content,
  //           file: page.internal.origin
  //         })
  //       })
  //     }
  //   })
  // }
}

module.exports = Plugins
