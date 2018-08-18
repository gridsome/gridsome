const path = require('path')
const Config = require('webpack-chain')
const { VueLoaderPlugin } = require('vue-loader')

const resolve = (p, c) => path.resolve(c || __dirname, p)

module.exports = (
  { context, outDir, assetsDir, publicPath, siteConfig },
  { isProd, isServer }
) => {
  const config = new Config()
  const inlineLimit = 10000
  const {
    cacheDirectory,
    cacheIdentifier
  } = createCacheOptions()

  config.mode(isProd ? 'production' : 'development')
  
  config.output
    .path(outDir)
    .publicPath(isProd ? publicPath : '/')
    .filename(`${assetsDir}/js/[name]${isProd ? '.[chunkhash:8]' : ''}.js`)

  config.resolve
    .set('symlinks', true)
    .alias
      .set('@gridsome/app', resolve('app'))
      .set('@gridsome/temp', resolve('src/.temp', context))
      .set('@gridsome/components', resolve('app/components/index.js'))
      .end()
    .extensions
      .merge(['.js', '.jsx', '.vue', '.json', '.styl'])
      .end()
    .modules
      .add(resolve('../../node_modules'))
      .add(resolve('../../../'))
      .add('node_modules')

  config.resolveLoader
    .set('symlinks', true)
    .modules
      .add(resolve('../../node_modules'))
      .add(resolve('../../../'))
      .add('node_modules')

  config.module
    .noParse(/^(vue|vue-router)$/)

  // vue

  config.module
    .rule('vue')
      .test(/\.vue$/)
      .use('cache-loader')
        .loader('cache-loader')
        .options({
          cacheDirectory,
          cacheIdentifier
        })
        end()
      .use('vue-loader')
        .loader('vue-loader')
        .options({
          compilerOptions: {
            preserveWhitespace: true
          },
          cacheDirectory,
          cacheIdentifier
        })

  // assets

  config.module
    .rule('images')
      .test(/\.(png|jpe?g|gif)(\?.*)?$/)
      .use('url-loader')
        .loader('url-loader')
        .options({
          limit: inlineLimit,
          name: `${assetsDir}/img/[name].[hash:8].[ext]`
        })

  config.module
    .rule('svg')
      .test(/\.(svg)(\?.*)?$/)
      .use('file-loader')
        .loader('file-loader')
        .options({
          name: `${assetsDir}/img/[name].[hash:8].[ext]`
        })

  config.module
    .rule('media')
      .test(/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/)
      .use('url-loader')
        .loader('url-loader')
        .options({
          limit: inlineLimit,
          name: `${assetsDir}/media/[name].[hash:8].[ext]`
        })

  config.module
    .rule('fonts')
      .test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/i)
      .use('url-loader')
        .loader('url-loader')
        .options({
          limit: inlineLimit,
          name: `${assetsDir}/fonts/[name].[hash:8].[ext]`
        })

  // css

  createCSSRule(config, 'css', /\.css$/)
  createCSSRule(config, 'postcss', /\.p(ost)?css$/)
  createCSSRule(config, 'scss', /\.scss$/, 'sass-loader', siteConfig.scss)
  createCSSRule(config, 'sass', /\.sass$/, 'sass-loader', Object.assign({ indentedSyntax: true }, siteConfig.sass))
  createCSSRule(config, 'less', /\.less$/, 'less-loader', siteConfig.less)
  createCSSRule(config, 'stylus', /\.styl(us)?$/, 'stylus-loader', Object.assign({
    preferPathResolver: 'webpack'
  }, siteConfig.stylus))

  // graphql

  config.module
    .rule('graphql')
    .resourceQuery(/blockType=graphql/)
    .use('page-query')
      .loader(require.resolve('./loaders/page-query'))

  config.module
    .rule('static-graphql')
    .resourceQuery(/blockType=static-query/)
    .use('static-query')
      .loader(require.resolve('./loaders/static-query'))

  // plugins
  
  config
    .plugin('vue-loader')
    .use(VueLoaderPlugin)

  config
    .plugin('injections')
    .use(require('webpack/lib/DefinePlugin'), [{
      'BASE_URL': JSON.stringify(siteConfig.base || '/'),
      'process.client': !!isClient,
      'process.server': !!isServer
    }])

  // helpes

  const createCacheOptions = () => ({
    cacheDirectory: resolve('../../node_modules/.cache/gridsome')
    cacheIdentifier: JSON.stringify({
      'gridsome': require('../../package.json').version,
      'cache-loader': require('cache-loader').version,
      'vue-loader': require('vue-loader').version,
      isProd,
      isServer
      // config: (
      //   (siteConfig.markdown ? JSON.stringify(siteConfig.markdown) : '') +
      //   (siteConfig.chainWebpack || '').toString() +
      //   (siteConfig.configureWebpack || '').toString()
      // )
    })
  })

  const createCSSRule = (config, lang, test, loader, options) => {
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

      rule.use('postcss-loader').loader('postcss-loader').options(Object.assign({
        plugins: [require('autoprefixer')],
        sourceMap: !isProd
      }, siteConfig.postcss))

      if (loader) {
        rule.use(loader).loader(loader).options(options)
      }
    }
  }

  return config
}
