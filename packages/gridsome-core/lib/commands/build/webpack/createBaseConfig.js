module.exports = (api, { isServer, isClient }) => {
  const config = api.resolveChainableWebpackConfig()

  config.stats('none')
  config.plugins.delete('friendly-errors')

  config
    .plugin('progress')
    .use(require('webpack/lib/ProgressPlugin'))

  config
    .plugin('define')
    .tap(args => [Object.assign({}, ...args, {
      'process.client': !!isClient,
      'process.server': !!isServer
    })])

  return config
}
