module.exports = function (api, options) {
  api.setClientOptions({
    ogTitle: options.foo
  })

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
