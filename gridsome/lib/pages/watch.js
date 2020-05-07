const path = require('path')
const { debounce } = require('lodash')

module.exports = (app, pages) => {
  const createPages = debounce(
    () => app.isBootstrapped && app.plugins.createPages(),
    16
  )
  const fetchQueries = debounce(
    () => app.isBootstrapped && app.broadcast({ type: 'fetch' }),
    16
  )
  const generateRoutes = debounce(
    () => app.isBootstrapped && app.codegen.generate('routes.js'),
    16
  )

  const insertedPages = []

  const onCreatePage = debounce(() => {
    console.log(insertedPages)
    pages.runOnCreatePageHooks(insertedPages)
    insertedPages.splice(0, insertedPages.length)
    app.codegen.generate('routes.js')
  }, 16)

  // Re-runs `api.onCreatePage()` when a new page is created.
  pages._pages.on('insert', page => {
    if (app.isBootstrapped) {
      insertedPages.push(page)
      onCreatePage()
    }
  })

  // Re-creates pages that was created in `api.createPages()`
  // when any node is added, removed or updated..
  app.store.on('change', () => createPages())

  // Re-generate routes.js when a page is removed.
  pages._pages.on('delete', () => generateRoutes())

  // Tells the client to fetch GraphQL queries
  // when a route component has changed.
  pages._routes.on('update', (route, oldRoute) => {
    if (!app.isBootstrapped) return

    if (oldRoute.path !== route.path) {
      return generateRoutes()
    }

    fetchQueries()
  })

  pages._watcher.on('change', filePath => {
    if (!app.isBootstrapped) return

    const component = path.normalize(filePath)
    const routes = pages._routes.find({ component })
    const length = routes.length

    pages.disableIndices()

    for (let i = 0; i < length; i++) {
      const { type, name, internal } = routes[i]
      const options = { type, name, path: internal.path, component }

      pages.updateRoute(options, {
        digest: internal.digest,
        isManaged: internal.isManaged
      })
    }

    pages.enableIndices()
  })
}
