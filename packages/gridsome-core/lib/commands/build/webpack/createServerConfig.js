const nodeExternals = require('webpack-node-externals')
const VueSSRServerPlugin = require('./plugins/VueSSRServerPlugin')
const createBaseConfig = require('./createBaseConfig')

module.exports = api => {
  const config = createBaseConfig(api, { isServer: true })

  config.plugins.delete('extract-css')

  config
    .entry('app')
    .delete(require.resolve('../../../../app/entry.client.js'))
    .add(require.resolve('../../../../app/entry.server.js'))

  config
    .target('node')
    .devtool('source-map')
    .externals(nodeExternals({
      whitelist: [/\.css$/, /\?vue&type=style/]
    }))

  config.output
    .libraryTarget('commonjs2')

  config.optimization
    .splitChunks(false)
    .minimize(false)

  config
    .plugin('ssr-server')
    .use(VueSSRServerPlugin, [{
      filename: 'manifest/server.json'
    }])

  const resolved = api.service.resolveWebpackConfig(config)

  for (const rule of resolved.module.rules) {
    if (rule.oneOf) {
      for (const oneOf of rule.oneOf) {
        if (oneOf.use) {
          for (const item of oneOf.use) {
            if (item.loader === 'css-loader') {
              item.loader = 'css-loader/locals'
            }
            if (/mini-css-extract-plugin/.test(item.loader)) {
              item.loader = 'vue-style-loader'
            }
          }
        }
      }
    }
    if (rule.use) {
      for (const item of rule.use) {
        if (item.loader === 'cache-loader') {
          item.options.cacheIdentifier += '-server'
          item.options.cacheDirectory += '-server'
        } else if (item.loader === 'vue-loader') {
          item.options.cacheIdentifier += '-server'
          item.options.cacheDirectory += '-server'
          item.options.optimizeSSR = true
        }
      }
    }
  }

  return resolved
}
