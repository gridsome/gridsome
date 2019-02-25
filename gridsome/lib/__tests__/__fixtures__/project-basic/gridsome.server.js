module.exports = function (api) {
  api.loadSource(store => {
    store.addMetaData('myTest', {
      value: 'Test Value'
    })

    const docs = store.addContentType('TestDoc')
    const fields = { rel: store.createReference('TestDoc', '2'), perPage: 2 }
    docs.addNode({ id: '1', title: 'Doc 1', path: '/docs/1', fields })
    docs.addNode({ id: '2', title: 'Doc 2', path: '/docs/2', fields })
    docs.addNode({ id: '3', title: 'Doc 3', path: '/docs/3', fields })
    docs.addNode({ id: '4', title: 'Doc 4', path: '/docs/4', fields })
    docs.addNode({ id: '5', title: 'Doc 5', path: '/docs/5', fields })

    const pages = store.addContentType('TestPage')
    pages.addNode({ id: '1', title: 'Page 1', path: '/pages/1', fields: { doc: '4' } })
    pages.addNode({ id: '2', title: 'Page 2', path: '/pages/2', fields: { doc: '3' } })
  })

  api.chainWebpack(config => {
    config.plugin('test-injections-3')
      .use(require('webpack/lib/DefinePlugin'), [{
        'TEST_3': JSON.stringify('test 3')
      }])
  })
}
