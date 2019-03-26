exports.createQueryContext = function (page, currentPage = undefined) {
  return {
    ...page.query.context,
    page: currentPage,
    path: page.path
  }
}

exports.createPagesAPI = function (api) {
  return {
    store: api.store,
    graphql: api._app.graphql,
    createPage (options) {
      return api._app.pages.createPage(options)
    },
    updatePage (options) {
      return api._app.pages.updatePage(options)
    },
    removePage (query) {
      return api._app.pages.removePage(query)
    },
    findPage (query) {
      return api._app.pages.findPage(query)
    },
    findPages (query) {
      return api._app.pages.findPages(query)
    }
  }
}
