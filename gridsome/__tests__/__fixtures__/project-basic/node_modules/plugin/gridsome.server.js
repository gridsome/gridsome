const path = require('path')

module.exports = function (api, options) {
  api.setClientOptions({
    ogTitle: options.foo
  })

  api.transpileDependencies([
    path.join(__dirname, 'test-es6-1.js')
  ])

  api.loadSource(store => {
    store.addMetaData('pluginValue', options.foo)
  })

  api.chainWebpack(config => {
    config.plugin('test-injections-2')
      .use(require('webpack/lib/DefinePlugin'), [{
        'TEST_2': JSON.stringify('test 2')
      }])
  })

  api.createSchema(graphql => {
    return new graphql.GraphQLSchema({
      query: new graphql.GraphQLObjectType({
        name: 'CustomRootQuery',
        fields: {
          customRootValue: {
            type: graphql.GraphQLString,
            resolve: () => 'string from custom schema'
          }
        }
      })
    })
  })
}
