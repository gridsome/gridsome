module.exports = function (api) {
  api.loadSource(store => {
    const posts = store.addContentType({
      typeName: 'Post',
      route: '/:slug'
    })

    for (let i = 1; i <= 50; i++) {
      posts.addNode({
        id: String(i),
        title: `Post ${i}`
      })
    }
  })
}
