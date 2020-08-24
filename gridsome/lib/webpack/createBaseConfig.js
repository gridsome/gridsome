const path = require('path')
const hash = require('hash-sum')
const { pick } = require('lodash')
const Config = require('webpack-chain')
const { forwardSlash } = require('../utils')
const { VueLoaderPlugin } = require('vue-loader')
const createHTMLRenderer = require('../server/createHTMLRenderer')
const GridsomeResolverPlugin = require('./plugins/GridsomeResolverPlugin')
const CSSExtractPlugin = require('mini-css-extract-plugin')

const resolve = (p, c) => path.resolve(c || __dirname, p)

module.exports = (app, { isProd, isServer }) => {
  const { config: projectConfig } = app
  const { publicPath } = projectConfig
  const { cacheDirectory, cacheIdentifier } = createCacheOptions()
  const assetsDir = path.relative(projectConfig.outputDir, projectConfig.assetsDir)
  const config = new Config()

  const useHash = isProd && !process.env.GRIDSOME_TEST && projectConfig.cacheBusting
  const filename = `[name]${useHash ? '.[contenthash:8]' : ''}.js`
  const assetname = `[name]${useHash ? '.[hash:8]' : ''}.[ext]`
  const inlineLimit = 10000

  config.mode(isProd ? 'production' : 'development')

  config.output
    .publicPath(publicPath)
    .path(projectConfig.outputDir)
    .chunkFilename(`${assetsDir}/js/${filename}`)
    .filename(`${assetsDir}/js/${filename}`)

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

  config.resolve
    .plugin('gridsome-fallback-resolver-plugin')
      .use(GridsomeResolverPlugin, [{
        fallbackDir: path.join(projectConfig.appPath, 'fallbacks'),
        optionalDir: path.join(app.context, 'src'),
        resolve: ['main', 'App.vue']
      }])

  config.resolveLoader
    .set('symlinks', true)
    .modules
    .add(resolve('./loaders'))
    .add(resolve('../../node_modules'))
    .add(resolve('../../../packages'))
    .add('node_modules')

  config.module.noParse(/^(vue|vue-router|vue-meta)$/)

  if (app.config.runtimeCompiler) {
    config.resolve.alias.set('vue$', 'vue/dist/vue.esm.js')
  }

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
          require('./modules/html')(),
          require('./modules/assets')()
        ]
      },
      cacheDirectory,
      cacheIdentifier
    })

  // js

  config.module.rule('js')
    .test(/\.js$/)
    .exclude
    .add(filepath => {
      if (/\.vue\.js$/.test(filepath)) {
        return false
      }

      if (/gridsome\.client\.js$/.test(filepath)) {
        return false
      }

      if (filepath.startsWith(projectConfig.appPath)) {
        return false
      }

      if (app.config.transpileDependencies.some(dep => {
        return typeof dep === 'string'
          ? filepath.includes(path.normalize(dep))
          : filepath.match(dep)
      })) {
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
        [require.resolve('@vue/babel-preset-app'), {
          entryFiles: [
            resolve('../../app/entry.server.js'),
            resolve('../../app/entry.client.js')
          ]
        }]
      ]
    })

  // css

  createCSSRule(config, 'css', /\.css$/, null, projectConfig.css.loaderOptions.css)
  createCSSRule(config, 'postcss', /\.p(ost)?css$/, null, projectConfig.css.loaderOptions.postcss)
  createCSSRule(config, 'scss', /\.scss$/, 'sass-loader', projectConfig.css.loaderOptions.scss)
  createCSSRule(config, 'sass', /\.sass$/, 'sass-loader', projectConfig.css.loaderOptions.sass)
  createCSSRule(config, 'less', /\.less$/, 'less-loader', projectConfig.css.loaderOptions.less)
  createCSSRule(config, 'stylus', /\.styl(us)?$/, 'stylus-loader', projectConfig.css.loaderOptions.stylus)

  // assets

  config.module.rule('images')
    .test(/\.(png|jpe?g|gif|webp)(\?.*)?$/)
    .use('url-loader')
    .loader('url-loader')
    .options({
      limit: inlineLimit,
      name: `${assetsDir}/img/${assetname}`
    })

  config.module.rule('svg')
    .test(/\.(svg)(\?.*)?$/)
    .use('file-loader')
    .loader('file-loader')
    .options({
      name: `${assetsDir}/img/${assetname}`
    })

  config.module.rule('media')
    .test(/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/)
    .use('url-loader')
    .loader('url-loader')
    .options({
      limit: inlineLimit,
      name: `${assetsDir}/media/${assetname}`
    })

  config.module.rule('fonts')
    .test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/i)
    .use('url-loader')
    .loader('url-loader')
    .options({
      limit: inlineLimit,
      name: `${assetsDir}/fonts/${assetname}`
    })

  // data

  config.module.rule('yaml')
    .test(/\.ya?ml$/)
    .use('json-loader')
    .loader('json-loader')
    .end()
    .use('yaml-loader')
    .loader('yaml-loader')

  // plugins

  if (process.stdout.isTTY && !process.env.GRIDSOME_TEST) {
    config.plugin('progress')
      .use(require('webpack/lib/ProgressPlugin'))
  }

  config.plugin('vue-loader')
    .use(VueLoaderPlugin)

  config.plugin('case-sensitive-paths')
    .use(require('case-sensitive-paths-webpack-plugin'))

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
    .use(require('webpack/lib/DefinePlugin'), [createEnv()])

  if (isProd && !isServer) {
    config.plugin('extract-css')
      .use(CSSExtractPlugin, [{
        filename: `${assetsDir}/css/styles${useHash ? '.[contenthash:8]' : ''}.css`
      }])
  }

  // Short hashes as ids for better long term caching.
  config.optimization.merge({ moduleIds: 'hashed' })

  if (process.env.GRIDSOME_TEST) {
    config.output.pathinfo(true)
    config.optimization.minimize(false)
    config.optimization.merge({ moduleIds: 'named' })
  }

  // helpes

  function createCacheOptions () {
    const values = app.compiler.hooks.cacheIdentifier.call({
      'gridsome': require('../../package.json').version,
      'cache-loader': require('cache-loader/package.json').version,
      'vue-loader': require('vue-loader/package.json').version,
      context: app.context,
      isProd,
      isServer,
      config: (
        (projectConfig.chainWebpack || '').toString()
      )
    })

    return {
      cacheDirectory: app.resolve('node_modules/.cache/gridsome'),
      cacheIdentifier: hash(values)
    }
  }

  function createCSSRule (config, lang, test, loader = null, options = {}) {
    const { css = {}, postcss = {}} = projectConfig.css.loaderOptions
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
        .loader('css-loader')
        .options(Object.assign({
          modules,
          exportOnlyLocals: isServer,
          localIdentName: `[local]_[hash:base64:8]`,
          importLoaders: 1,
          sourceMap: !isProd
        }, css))

      rule.use('postcss-loader')
        .loader('postcss-loader')
        .options(Object.assign({
          sourceMap: !isProd
        }, postcss, {
          plugins: (postcss.plugins || []).concat(require('autoprefixer'))
        }))

      if (loader) {
        rule.use(loader).loader(loader).options(options)
      }
    }
  }

  function createEnv () {
    const assetsUrl = forwardSlash(path.join(publicPath, assetsDir, '/'))
    const dataUrl = forwardSlash(path.join(assetsUrl, 'data', '/'))

    const baseEnv = {
      'process.env.PUBLIC_PATH': JSON.stringify(publicPath),
      'process.env.ASSETS_URL': JSON.stringify(assetsUrl),
      'process.env.DATA_URL': JSON.stringify(dataUrl),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || ''),
      'process.isClient': !isServer,
      'process.isServer': isServer,
      'process.isProduction': process.env.NODE_ENV === 'production',
      'process.isStatic': process.env.GRIDSOME_MODE === 'static'
    }

    // merge variables start with GRIDSOME_ENV to config.env
    const gridsomeEnv = pick(process.env, Object.keys(process.env).filter(key => key.startsWith('GRIDSOME_')))
    const mergeEnv = Object.entries(gridsomeEnv)
      .reduce((acc, [key, value]) => {
        acc[`process.env.${key}`] = ['boolean', 'number'].includes(typeof value) ? value : JSON.stringify(value)
        return acc
      }, {})

    return {
      ...baseEnv,
      ...mergeEnv
    }
  }

  return config
}
