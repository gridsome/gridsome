const path = require('path')
const webpack = require('webpack')
const createBaseConfig = require('./createBaseConfig')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

const resolve = p => path.resolve(__dirname, p)

module.exports = async app => {
  const isProd = process.env.NODE_ENV === 'production'
  const config = createBaseConfig(app, { isProd, isServer: false })
  const { outputDir, clientManifestPath, css } = app.config

  config.entry('app').add(resolve('../../app/entry.client.js'))

  if (isProd) {
    config.plugin('vue-server-renderer')
      .use(require('vue-server-renderer/client-plugin'), [{
        filename: path.relative(outputDir, clientManifestPath)
      }])

    config.optimization.minimizer('css-minimizer-webpack-plugin')
      .use(CssMinimizerPlugin)

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

    config.plugin('hmr').use(webpack.HotModuleReplacementPlugin)
  }

  return config
}
