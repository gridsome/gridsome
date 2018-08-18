const path = require('path')
const createBaseConfig = require('./createBaseConfig')

const resolve = p => path.resolve(__dirname, p)

module.exports = (options, { isProd }) => {
  const config = createBaseConfig(options, { isProd, isServer: false })

  config
    .entry('app')
      .add(resolve('../app/entry.client.js'))

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

  if (isProd) {
    config
      .plugin('ssr-client')
      .use(require('./plugins/VueSSRClientPlugin'), [{
        filename: 'manifest/client.json'
      }])

    config
      .plugin('optimize-css')
      .use(require('optimize-css-assets-webpack-plugin'), [{
        canPrint: false,
        cssProcessorOptions: {
          safe: true,
          autoprefixer: { disable: true },
          mergeLonghand: false
        }
      }])
  }

  return config
}
