module.exports = function (api) {
  api.loadSource(({ addCollection }) => {
    const posts = addCollection('Post')

    for (let i = 1; i <= 10; i++) {
      posts.addNode({
        id: i,
        title: `Post #${i}`,
        slug: `post-${i}`
      })
    }
  })
}
