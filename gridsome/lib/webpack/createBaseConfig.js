const path = require('path')
const Config = require('webpack-chain')
const { VueLoaderPlugin } = require('vue-loader')
const CSSExtractPlugin = require('mini-css-extract-plugin')

const resolve = (p, c) => path.resolve(c || __dirname, p)

module.exports = (context, options, { isProd, isServer }) => {
  const { cacheDirectory, cacheIdentifier } = createCacheOptions()
  const assetsDir = options.assetsDir
  const outDir = options.outDir
  const config = new Config()

  const filename = `${assetsDir}/js/[name]${isProd ? '.[chunkhash:8]' : ''}.js`
  const inlineLimit = 10000

  config.mode(isProd ? 'production' : 'development')

  config.entry('app').add(resolve('src/main.js', context))
  
  config.output
    .path(resolve(outDir, context))
    .publicPath(isProd ? options.publicPath || '/' : '/')
    .filename(filename)

  config.resolve
    .set('symlinks', true)
    .alias
      .set('@', resolve('src', context))
      .set('@gridsome/app', resolve('../../app'))
      .set('@gridsome/temp', resolve('src/.temp', context))
      .set('@gridsome/components', resolve('../../app/components/index.js'))
      .end()
    .extensions
      .merge(['.js', '.vue', '.json'])
      .end()
    .modules
      .add(resolve('../../node_modules'))
      .add(resolve('../../../packages'))
      .add('node_modules')

  config.resolveLoader
    .set('symlinks', true)
    .modules
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
          preserveWhitespace: false
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
        if (filepath.startsWith(options.appPath)) {
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
        presets: [require.resolve('./babel-preset')]
      })

  // css

  createCSSRule(config, 'css', /\.css$/)
  createCSSRule(config, 'postcss', /\.p(ost)?css$/)
  createCSSRule(config, 'scss', /\.scss$/, 'sass-loader', options.scss)
  createCSSRule(config, 'sass', /\.sass$/, 'sass-loader', Object.assign({ indentedSyntax: true }, options.sass))
  createCSSRule(config, 'less', /\.less$/, 'less-loader', options.less)
  createCSSRule(config, 'stylus', /\.styl(us)?$/, 'stylus-loader', Object.assign({
    preferPathResolver: 'webpack'
  }, options.stylus))

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


  // graphql

  config.module.rule('graphql')
    .resourceQuery(/blockType=graphql/)
    .use('page-query')
      .loader(require.resolve('./loaders/page-query'))

  config.module.rule('static-graphql')
    .resourceQuery(/blockType=static-query/)
    .use('static-query')
      .loader(require.resolve('./loaders/static-query'))

  // plugins
  
  config.plugin('progress')
    .use(require('webpack/lib/ProgressPlugin'))

  config.plugin('vue-loader')
    .use(VueLoaderPlugin)

  config.plugin('case-sensitive-paths')
    .use(require('case-sensitive-paths-webpack-plugin'))

  // config.plugin('friendly-errors')
  //   .use(require('friendly-errors-webpack-plugin'))

  config.plugin('html')
    .use(require('html-webpack-plugin'), [{
      template: resolve('../../app/index.dev.html')
    }])

  config.plugin('injections')
    .use(require('webpack/lib/DefinePlugin'), [{
      'BASE_URL': JSON.stringify(options.base || '/'),
      'GRIDSOME_HASH': JSON.stringify(new Date().getTime().toString()),
      'process.client': !isServer,
      'process.server': isServer
    }])

  if (isProd && !isServer) {
    config.plugin('extract-css')
      .use(CSSExtractPlugin, [{
        filename: `${assetsDir}/css/styles.[chunkhash:8].css`
      }])
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
          (options.chainWebpack || '').toString() +
          (options.configureWebpack || '').toString()
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
