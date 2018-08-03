const path = require('path')
const appPath = path.resolve('./app')

module.exports = (api, options) => {
  require('./lib/commands/build')(api)
  require('./lib/commands/develop')(api)
  require('./lib/commands/explore')(api)

  options.transpileDependencies.push(
    path.resolve('./app')
  )

  api.chainWebpack((config) => {
    config
      .entry('app')
      .add(require.resolve('./app/entry.client.js'))

    config.resolve.alias
      .set('#app', path.resolve(__dirname, 'app'))

    config.module
      .rule('graphql')
      .resourceQuery(/blockType=graphql/)
      .use('page-query')
        .loader(
          require.resolve('./lib/graphql/loaders/page-query')
        )

    config.module
      .rule('static-graphql')
      .resourceQuery(/blockType=static-query/)
      .use('static-query')
        .loader(
          require.resolve('./lib/graphql/loaders/static-query')
        )
  })
}

module.exports.defaultModes = {
  'gridsome:build': 'production',
  'gridsome:develop': 'development',
  'gridsome:explore': 'development'
}
