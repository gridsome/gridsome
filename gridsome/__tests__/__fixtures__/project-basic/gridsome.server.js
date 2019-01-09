module.exports = function (api) {
  api.loadSource(store => {
    const posts = store.addContentType({
      typeName: 'Post',
      route: '/blog/:slug'
    })

    posts.addNode({
      id: '1',
      title: 'First post',
      date: '2017-05-23',
      fields: {
        dateFormat: 'YYYY'
      }
    })

    posts.addNode({
      id: '2',
      title: 'Second post',
      date: '2018-03-18',
      fields: {
        dateFormat: 'YYYY'
      }
    })

    posts.addNode({
      id: '3',
      title: 'Third post',
      date: '2018-11-12',
      fields: {
        dateFormat: 'YYYY'
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
