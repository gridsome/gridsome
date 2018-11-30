const path = require('path')
const Config = require('webpack-chain')
const { forwardSlash } = require('../utils')
const { VueLoaderPlugin } = require('vue-loader')
const createHTMLRenderer = require('../server/createHTMLRenderer')
const CSSExtractPlugin = require('mini-css-extract-plugin')

const resolve = (p, c) => path.resolve(c || __dirname, p)

module.exports = (app, { isProd, isServer }) => {
  const { config: projectConfig } = app
  const { cacheDirectory, cacheIdentifier } = createCacheOptions()
  const assetsDir = path.relative(projectConfig.targetDir, projectConfig.assetsDir)
  const pathPrefix = forwardSlash(path.join(projectConfig.pathPrefix, '/'))
  const config = new Config()

  const filename = `${assetsDir}/js/[name]${isProd ? '.[contenthash]' : ''}.js`
  const inlineLimit = 10000

  config.mode(isProd ? 'production' : 'development')

  config.output
    .path(projectConfig.targetDir)
    .publicPath(isProd ? pathPrefix : '/')
    .chunkFilename(filename)
    .filename(filename)

  config.resolve
    .set('symlinks', true)
    .alias
    .set('~', resolve('src', app.context))
    .set('@', resolve('src', app.context))
    .set('gridsome$', path.resolve(projectConfig.appPath, 'index.js'))
    .end()
    .extensions
    .merge(['.js', '.vue'])
    .end()
    .modules
    .add(resolve('../../node_modules'))
    .add(resolve('../../../packages'))
    .add('node_modules')

  config.resolveLoader
    .set('symlinks', true)
    .modules
    .add(resolve('./loaders'))
    .add(resolve('../../node_modules'))
    .add(resolve('../../../packages'))
    .add('node_modules')

  config.module.noParse(/^(vue|vue-router)$/)

  if (!isProd) {
    config.devtool('cheap-module-eval-source-map')
  }

  // vue

  config.module.rule('vue')
    .test(/\.vue$/)
    .use('cache-loader')
    .loader('cache-loader')
    .options({
      cacheDirectory,
      cacheIdentifier
    })
    .end()
    .use('vue-loader')
    .loader('vue-loader')
    .options({
      compilerOptions: {
        preserveWhitespace: false,
        modules: [
          require('./modules/assets')()
        ]
      },
      cacheDirectory,
      cacheIdentifier
    })

  // js

  config.module.rule('js')
    .test(/\.jsx?$/)
    .exclude
    .add(filepath => {
      if (/\.vue\.jsx?$/.test(filepath)) {
        return false
      }
      if (/gridsome\.client\.js$/.test(filepath)) {
        return false
      }
      if (filepath.startsWith(projectConfig.appPath)) {
        return false
      }
      return /node_modules/.test(filepath)
    })
    .end()
    .use('cache-loader')
    .loader('cache-loader')
    .options({
      cacheDirectory,
      cacheIdentifier
    })
    .end()
    .use('babel-loader')
    .loader('babel-loader')
    .options({
      presets: [
        require.resolve('./babel-preset')
      ]
    })

  // css

  createCSSRule(config, 'css', /\.css$/)
  createCSSRule(config, 'postcss', /\.p(ost)?css$/)
  createCSSRule(config, 'scss', /\.scss$/, 'sass-loader', projectConfig.scss)
  createCSSRule(config, 'sass', /\.sass$/, 'sass-loader', Object.assign({ indentedSyntax: true }, projectConfig.sass))
  createCSSRule(config, 'less', /\.less$/, 'less-loader', projectConfig.less)
  createCSSRule(config, 'stylus', /\.styl(us)?$/, 'stylus-loader', Object.assign({
    preferPathResolver: 'webpack'
  }, projectConfig.stylus))

  // assets

  config.module.rule('images')
    .test(/\.(png|jpe?g|gif)(\?.*)?$/)
    .use('url-loader')
    .loader('url-loader')
    .options({
      limit: inlineLimit,
      name: `${assetsDir}/img/[name].[hash:8].[ext]`
    })

  config.module.rule('svg')
    .test(/\.(svg)(\?.*)?$/)
    .use('file-loader')
    .loader('file-loader')
    .options({
      name: `${assetsDir}/img/[name].[hash:8].[ext]`
    })

  config.module.rule('media')
    .test(/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/)
    .use('url-loader')
    .loader('url-loader')
    .options({
      limit: inlineLimit,
      name: `${assetsDir}/media/[name].[hash:8].[ext]`
    })

  config.module.rule('fonts')
    .test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/i)
    .use('url-loader')
    .loader('url-loader')
    .options({
      limit: inlineLimit,
      name: `${assetsDir}/fonts/[name].[hash:8].[ext]`
    })

  // data

  config.module.rule('yaml')
    .test(/\.ya?ml$/)
    .use('json-loader')
    .loader('json-loader')
    .end()
    .use('yaml-loader')
    .loader('yaml-loader')

  // graphql

  // TODO: remove graphql loader before v1.0
  config.module.rule('graphql')
    .resourceQuery(/blockType=(graphql|page-query)/)
    .use('page-query')
    .loader(require.resolve('./loaders/page-query'))

  config.module.rule('static-graphql')
    .resourceQuery(/blockType=static-query/)
    .use('static-query')
    .loader(require.resolve('./loaders/static-query'))

  // plugins

  if (process.stdout.isTTY) {
    config.plugin('progress')
      .use(require('webpack/lib/ProgressPlugin'))
  }

  config.plugin('vue-loader')
    .use(VueLoaderPlugin)

  config.plugin('case-sensitive-paths')
    .use(require('case-sensitive-paths-webpack-plugin'))

  // config.plugin('friendly-errors')
  //   .use(require('friendly-errors-webpack-plugin'))

  if (!isProd) {
    config.plugin('html')
      .use(require('html-webpack-plugin'), [{
        minify: true,
        templateContent () {
          return createHTMLRenderer(projectConfig.htmlTemplate)({
            app: '<div id="app"></div>'
          })
        }
      }])
  }

  config.plugin('injections')
    .use(require('webpack/lib/DefinePlugin'), [{
      'PATH_PREFIX': JSON.stringify(projectConfig.pathPrefix),
      'GRIDSOME_CACHE_DIR': JSON.stringify(projectConfig.cacheDir),
      'GRIDSOME_DATA_DIR': JSON.stringify(`${projectConfig.cacheDir}/data`),
      'GRIDSOME_MODE': JSON.stringify(process.env.GRIDSOME_MODE || ''),
      'process.isClient': !isServer,
      'process.isServer': isServer
    }])

  if (isProd && !isServer) {
    config.plugin('extract-css')
      .use(CSSExtractPlugin, [{
        filename: `${assetsDir}/css/styles.[chunkhash:8].css`
      }])

    config.optimization.splitChunks({
      cacheGroups: {
        data: {
          test: m => m.resource && m.request.startsWith(`${projectConfig.cacheDir}/data`),
          name: false,
          chunks: 'all',
          maxSize: 60000,
          minSize: 5000
        }
      }
    })
  }

  // helpes

  function createCacheOptions () {
    return {
      cacheDirectory: resolve('../../node_modules/.cache/gridsome'),
      cacheIdentifier: JSON.stringify({
        'gridsome': require('../../package.json').version,
        'cache-loader': require('cache-loader').version,
        'vue-loader': require('vue-loader').version,
        isProd,
        isServer,
        config: (
          (projectConfig.chainWebpack || '').toString()
        )
      })
    }
  }

  function createCSSRule (config, lang, test, loader = null, options = {}) {
    const baseRule = config.module.rule(lang).test(test)
    const modulesRule = baseRule.oneOf('modules').resourceQuery(/module/)
    const normalRule = baseRule.oneOf('normal')

    applyLoaders(modulesRule, true)
    applyLoaders(normalRule, false)

    function applyLoaders (rule, modules) {
      if (!isServer) {
        if (isProd) {
          rule.use('extract-css-loader').loader(CSSExtractPlugin.loader)
        } else {
          rule.use('vue-style-loader').loader('vue-style-loader')
        }
      }

      rule.use('css-loader')
        .loader(isServer ? 'css-loader/locals' : 'css-loader')
        .options({
          modules,
          localIdentName: `[local]_[hash:base64:8]`,
          importLoaders: 1,
          sourceMap: !isProd
        })

      rule.use('postcss-loader')
        .loader('postcss-loader')
        .options(Object.assign({
          plugins: [require('autoprefixer')],
          sourceMap: !isProd
        }, options.postcss))

      if (loader) {
        rule.use(loader).loader(loader).options(options)
      }
    }
  }

  return config
}
