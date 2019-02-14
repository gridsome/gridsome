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

    const other = store.addContentType({
      typeName: 'Other'
    })

    categories.addNode({
      id: '1',
      title: 'First category',
      path: '/category/first',
      fields: {
        showType: 'Post'
      }
    })

    categories.addNode({
      id: '2',
      title: 'Second category',
      path: '/category/second'
    })

    tags.addNode({ id: '1', title: 'First tag', fields: { perPage: 2 }})
    tags.addNode({ id: '2', title: 'Second tag', fields: { perPage: 2 } })
    tags.addNode({ id: '3', title: 'Third tag', fields: { perPage: 2 } })
    tags.addNode({ id: '4', title: 'Fourth tag', fields: { perPage: 2 } })

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
        dateFormat: 'YYYY-MM',
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
        dateFormat: 'YYYY-MM-DD',
        tags: [
          posts.createReference('1', 'Tag'),
          posts.createReference('3', 'Tag'),
          posts.createReference('4', 'Tag')
        ],
        category: posts.createReference('1', 'Category')
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

    for (let i = 1; i <= 10; i++) {
      other.addNode({
        id: String(i),
        title: `Other ${i}`,
        fields: {
          category: { id: '1', typeName: 'Category' }
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
