const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const VueSSRClientPlugin = require('./plugins/VueSSRClientPlugin')
const createBaseConfig = require('./createBaseConfig')

module.exports = api => {
  const config = createBaseConfig(api, { isClient: true })

  config.node
    .merge({
      setImmediate: false,
      global: false,
      process: false,
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    })

  config
    .plugin('ssr-client')
    .use(VueSSRClientPlugin, [{
      filename: 'manifest/client.json'
    }])

  config
    .plugin('optimize-css')
    .use(OptimizeCssAssetsPlugin, [{
      canPrint: false,
      cssProcessorOptions: {
        safe: true,
        autoprefixer: { disable: true },
        mergeLonghand: false
      }
    }])

  return api.service.resolveWebpackConfig(config)
}
