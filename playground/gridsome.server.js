module.exports = (api) => {
  api.loadSource(({ addCollection }) => {
    const posts = addCollection('Post')

    posts.addNode({
      title: 'Post #1',
      slug: 'post-1',
      excerpt: 'This is the first post'
    })
    posts.addNode({
      title: 'Post #2',
      slug: 'post-2',
      excerpt: 'This is the second post'
    })
    posts.addNode({
      title: 'Post #3',
      slug: 'post-3',
      excerpt: 'This is the third post'
    })
  })
}
