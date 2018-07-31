import '@temp/hot.js'

export default (apolloProvider) => {
  if (module.hot) {
    module.hot.accept('@temp/hot.js', () => {
      import('@temp/hot.js').then(() => {
        // refetch all Apollo GraphQL queries
        Object.values(apolloProvider.clients)
          .forEach(client => {
            client.cache.reset()
            client.resetStore()
          })
      })
    })
  }
}
