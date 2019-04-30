exports.createQueryVariables = function (page, currentPage = undefined) {
  return {
    ...page.query.variables,
    page: currentPage,
    __path: page.path
  }
}

exports.createPagesAPI = function (api, { digest }) {
  const { graphql, store, pages } = api._app

  return {
    graphql,
    getContentType (typeName) {
      return store.getContentType(typeName)
    },
    createPage (options) {
      return pages.createPage(options, { digest, isManaged: false })
    }
  }
}

exports.createManagedPagesAPI = function (api, { digest }) {
  const internals = { digest, isManaged: true }
  const { graphql, store, pages } = api._app

  return {
    graphql,
    getContentType (typeName) {
      return store.getContentType(typeName)
    },
    createPage (options) {
      return pages.createPage(options, internals)
    },
    updatePage (options) {
      return pages.updatePage(options, internals)
    },
    removePage (page) {
      return pages.removePage(page)
    },
    removePageByPath (path) {
      return pages.removePageByPath(path)
    },
    removePagesByComponent (component) {
      return pages.removePagesByComponent(component)
    },
    findAndRemovePages (query) {
      return pages.findAndRemovePages(query)
    },
    findPage (query) {
      return pages.findPage(query)
    },
    findPages (query) {
      return pages.findPages(query)
    }
  }
}
