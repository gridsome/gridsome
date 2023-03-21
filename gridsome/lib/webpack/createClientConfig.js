const path = require('path')
const createBaseConfig = require('./createBaseConfig')

const resolve = p => path.resolve(__dirname, p)

module.exports = async app => {
  const isProd = process.env.NODE_ENV === 'production'
  const config = createBaseConfig(app, { isProd, isServer: false })
  const { outputDir, clientManifestPath, css } = app.config

  config.entry('app').add(resolve('../../app/entry.client.js'))

  config.node.merge({
    setImmediate: false
  })

  if (isProd) {
    config.plugin('vue-server-renderer')
      .use(require('./plugins/VueSSRClientPlugin'), [{
        filename: path.relative(outputDir, clientManifestPath)
      }])

    config.plugin('optimize-css')
      .use(require('optimize-css-assets-webpack-plugin'), [{
        canPrint: false,
        cssProcessorOptions: {
          safe: true,
          autoprefixer: { disable: true },
          mergeLonghand: false
        }
      }])

    if (css.split !== true) {
      const cacheGroups = {
        styles: {
          name: 'styles',
          test: m => /css\/mini-extract/.test(m.type),
          chunks: 'all',
          enforce: true
        }
      }
      config.optimization.splitChunks({ cacheGroups })
    }
  } else {
    config.entry('app').add(resolve('../../app/entry.sockjs.js'))

    config.plugin('hmr')
      .use(require('webpack/lib/HotModuleReplacementPlugin'))

    config.plugin('no-emit-on-errors')
      .use(require('webpack/lib/NoEmitOnErrorsPlugin'))
  }

  return config
}
