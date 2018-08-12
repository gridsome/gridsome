const path = require('path')

module.exports = (api, options) => {
  options._buildTime = new Date().getTime().toString()
  options.transpileDependencies.push(
    path.resolve('./app')
  )

  require('./lib/commands/build')(api, options)
  require('./lib/commands/develop')(api, options)
  require('./lib/commands/explore')(api, options)

  api.chainWebpack((config) => {
    config
      .entry('app')
      .add(require.resolve('./app/entry.client.js'))

    config.resolve.alias
      .set('#app', path.resolve(__dirname, 'app'))
      .set('#temp', api.resolve('src/.temp'))

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

    config
      .plugin('define')
        .tap((args) => [Object.assign({}, ...args, {
          'GRIDSOME_HASH': JSON.stringify(options._buildTime)
        })])
  })
}

module.exports.defaultModes = {
  'gridsome:build': 'production',
  'gridsome:develop': 'development',
  'gridsome:explore': 'production'
}
