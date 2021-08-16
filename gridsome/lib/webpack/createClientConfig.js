const path = require('path')
const createBaseConfig = require('./createBaseConfig')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

const resolve = p => path.resolve(__dirname, p)

module.exports = async app => {
  const { ESBuildMinifyPlugin } = require('esbuild-loader')

  const isProd = process.env.NODE_ENV === 'production'
  const config = createBaseConfig(app, { isProd, isServer: false })
  const { outputDir, clientManifestPath, css } = app.config

  config.entry('app').add(resolve('../../app/entry.client.js'))

  config.resolve.merge({
    fallback: {
      process: require.resolve('process/browser')
    }
  })

  config.plugin('provide')
    .use(require('webpack/lib/ProvidePlugin'), [{
      process: require.resolve('process/browser')
    }])

  if (isProd) {
    config.plugin('vue-server-renderer')
      .use(require('./plugins/VueSSRClientPlugin'), [{
        filename: path.relative(outputDir, clientManifestPath)
      }])

    const cacheGroups = {
      vendor: {
        test(mod) {
          if (!mod.context) {
            return true
          }
          if (mod.context.startsWith(app.config.appCacheDir)) {
            return false
          }
          return mod.context.includes('node_modules')
        },
        name: 'vendors',
        chunks: 'all'
      }
    }

    if (css.split !== true) {
      cacheGroups.styles = {
        name: 'styles',
        test: m => /css\/mini-extract/.test(m.type),
        chunks: 'all',
        enforce: true
      }
    }

    config.optimization
      .minimize(true)
      .runtimeChunk('single')
      .splitChunks({ cacheGroups })
      .minimizer('esbuild')
        .use(ESBuildMinifyPlugin, [{
          // TODO: update when fixed in esbuild-loader
          // implementation: require('esbuild').transform
        }])
        .end()
      .minimizer('css-minimizer-webpack-plugin')
        .use(CssMinimizerPlugin)
        .end()
      .merge({ moduleIds: 'deterministic' })
  } else {
    config.entry('app').add(resolve('../../app/entry.sockjs.js'))

    config.plugin('no-emit-on-errors')
      .use(require('webpack/lib/NoEmitOnErrorsPlugin'))

    config.plugin('friendly-errors')
      .use(require('@soda/friendly-errors-webpack-plugin'))

    config.stats('none') // `@soda/friendly-errors-webpack-plugin` shows the errors
  }

  if (process.env.GRIDSOME_TEST) {
    config.output.pathinfo(true)
    config.optimization.minimize(false)
    config.optimization.merge({ moduleIds: 'named' })
  }

  return config
}
