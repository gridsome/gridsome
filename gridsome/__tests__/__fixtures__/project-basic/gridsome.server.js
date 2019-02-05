module.exports = function (api) {
  api.loadSource(store => {
    const posts = store.addContentType({
      typeName: 'Post',
      route: '/blog/:slug'
    })

    const tags = store.addContentType({
      typeName: 'Tag',
      route: '/tag/:slug'
    })

    const categories = store.addContentType({
      typeName: 'Category'
    })

    categories.addNode({ id: '1', title: 'First category', path: '/category/first' })

    tags.addNode({ id: '1', title: 'First tag' })
    tags.addNode({ id: '2', title: 'Second tag' })
    tags.addNode({ id: '3', title: 'Third tag' })
    tags.addNode({ id: '4', title: 'Fourth tag' })

    posts.addNode({
      id: '1',
      title: 'First post',
      date: '2017-05-23',
      fields: {
        tags: [
          { id: '2', typeName: 'Tag' },
          { id: '3', typeName: 'Tag' },
          { id: '4', typeName: 'Tag' }
        ],
        category: { id: '1', typeName: 'Category' }
      }
    })

    posts.addNode({
      id: '2',
      title: 'Second post',
      date: '2018-03-18',
      fields: {
        tags: [
          { id: '1', typeName: 'Tag' },
          { id: '2', typeName: 'Tag' },
          { id: '4', typeName: 'Tag' }
        ],
        category: { id: '1', typeName: 'Category' }
      }
    })

    posts.addNode({
      id: '3',
      title: 'Third post',
      date: '2018-11-12',
      fields: {
        tags: [
          { id: '1', typeName: 'Tag' },
          { id: '3', typeName: 'Tag' },
          { id: '4', typeName: 'Tag' }
        ],
        category: { id: '1', typeName: 'Category' }
      }
    })

    for (let i = 4; i < 14; i++) {
      posts.addNode({
        title: `Post ${i}`,
        fields: {
          excluded: true
        }
      })
    }

    store.addMetaData('myTest', {
      value: 'Test Value'
    })
  })

  api.chainWebpack(config => {
    config.plugin('test-injections-3')
      .use(require('webpack/lib/DefinePlugin'), [{
        'TEST_3': JSON.stringify('test 3')
      }])
  })
}
