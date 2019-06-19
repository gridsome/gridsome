module.exports = function createContext (app) {
  return {
    store: createStoreActions(app.store),
    pages: createPagesAction(app.pages),
    config: app.config,
    assets: app.assets,
    // TODO: remove before 1.0
    queue: app.assets
  }
}

function createStoreActions (store) {
  return {
    getContentType (typeName) {
      return store.getContentType(typeName)
    },
    getNodeByUid (uid) {
      return store.getNodeByUid(uid)
    },
    getNode (typeName, id) {
      return store.getNode(typeName, id)
    },
    chainIndex (query) {
      return store.chainIndex(query)
    }
  }
}

function createPagesAction (pages) {
  return {
    findPage (query) {
      return pages.findPage(query)
    },
    findPages (query) {
      return pages.findPages(query)
    }
  }
}
