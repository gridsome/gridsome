exports.createQueryVariables = function (page, currentPage = undefined) {
  return {
    ...page.query.variables,
    page: currentPage,
    __path: page.path
  }
}

exports.createPagesAPI = function (api) {
  return {
    graphql: api._app.graphql,
    getContentType (typeName) {
      return api.store.getContentType(typeName)
    },
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
