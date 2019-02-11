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
        dateFormat: 'YYYY',
        tags: [
          posts.createReference('2', 'Tag'),
          posts.createReference('3', 'Tag'),
          posts.createReference('4', 'Tag')
        ],
        category: posts.createReference('1', 'Category')
      }
    })

    posts.addNode({
      id: '2',
      title: 'Second post',
      date: '2018-03-18',
      fields: {
        dateFormat: 'YYYY',
        tags: [
          posts.createReference('1', 'Tag'),
          posts.createReference('2', 'Tag'),
          posts.createReference('4', 'Tag')
        ],
        category: posts.createReference('1', 'Category')
      }
    })

    posts.addNode({
      id: '3',
      title: 'Third post',
      date: '2018-11-12',
      fields: {
        dateFormat: 'YYYY',
        tags: [
          posts.createReference('1', 'Tag'),
          posts.createReference('3', 'Tag'),
          posts.createReference('4', 'Tag')
        ],
        category: posts.createReference('1', 'Category')
      }
    })

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
