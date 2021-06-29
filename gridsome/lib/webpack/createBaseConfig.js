const path = require('path')
const hash = require('hash-sum')
const { pick } = require('lodash')
const Config = require('webpack-chain')
const { forwardSlash } = require('../utils')
const { VueLoaderPlugin } = require('vue-loader')
const createHTMLRenderer = require('../server/createHTMLRenderer')
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
    .chunkFilename(filename)
    .filename(filename)

  config.resolve
    .set('symlinks', true)
    .alias
    .set('~', resolve('src', app.context))
    .set('@', resolve('src', app.context))
    .set('#gridsome', projectConfig.appCacheDir)
    .set('gridsome$', path.resolve(projectConfig.appPath, 'index.js'))
    .end()
    .extensions
    .merge(['.js', '.mjs', '.vue'])
    .end()

  config.resolve.merge({
    fallback: ['main', 'App.vue'].reduce((fallback, filename) => {
      fallback[path.join(app.context, 'src', filename)] = path.join(projectConfig.appPath, 'fallbacks', filename)
      return fallback
    }, {})
  })

  config.resolveLoader
    .set('symlinks', true)

  config.module.noParse(/^(vue|vue-router|vue-meta)$/)

  if (app.config.runtimeCompiler) {
    config.resolve.alias.set('vue$', require.resolve('vue/dist/vue.esm.js'))
  } else {
    config.resolve.alias.set('vue$', path.dirname(require.resolve('vue/package.json')))
  }

  if (!isProd) {
    config.devtool('eval-cheap-module-source-map')
  }

  // vue

  config.module.rule('vue')
    .test(/\.vue$/)
    .use('cache-loader')
    .loader(require.resolve('cache-loader'))
    .options({
      cacheDirectory,
      cacheIdentifier
    })
    .end()
    .use('vue-loader')
    .loader(require.resolve('vue-loader'))
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
    .test(/\.m?js$/)
    .exclude
    .add(filepath => {
      if (/\.vue\.js$/.test(filepath)) {
        return false
      }

      if (/gridsome\.client\.js$/.test(filepath)) {
        return false
      }

      if (
        filepath.startsWith(projectConfig.appPath) ||
        filepath.startsWith(projectConfig.appCacheDir)
      ) {
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
    .loader(require.resolve('cache-loader'))
    .options({
      cacheDirectory,
      cacheIdentifier
    })
    .end()
    .use('babel-loader')
    .loader(require.resolve('babel-loader'))
    .options({
      presets: [
        [require.resolve('@vue/babel-preset-app'), {
          entryFiles: [
            resolve('../../app/entry.server.js'),
            resolve('../../app/entry.client.js')
          ]
        }]
      ],
      plugins: [
        require.resolve('./plugins/corejsBabelPlugin.js')
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
    .type('asset')
    .parser({
      dataUrlCondition: {
        maxSize: inlineLimit
      }
    })
    .merge({
      generator: {
        filename: `${assetsDir}/img/${assetname}`
      }
    })

  config.module.rule('svg')
    .test(/\.(svg)(\?.*)?$/)
    .type('asset/resource')
    .merge({
      generator: {
        filename: `${assetsDir}/img/${assetname}`
      }
    })

  config.module.rule('media')
    .test(/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/)
    .type('asset')
    .parser({
      dataUrlCondition: {
        maxSize: inlineLimit
      }
    })
    .merge({
      generator: {
        filename: `${assetsDir}/media/${assetname}`
      }
    })

  config.module.rule('fonts')
    .test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/i)
    .type('asset')
    .parser({
      dataUrlCondition: {
        maxSize: inlineLimit
      }
    })
    .merge({
      generator: {
        filename: `${assetsDir}/fonts/${assetname}`
      }
    })

  // g-image / g-link

  for (const name of ['g-image', 'g-link']) {
    config.module.rule(name)
      .resourceQuery(new RegExp(name))
      .type('javascript/auto')
      .use(`${name}-loader`)
        .loader(require.resolve('./loaders/assets-loader'))
        .options({ assets: app.assets })
  }

  // data

  config.module.rule('yaml')
    .test(/\.ya?ml$/)
    .type('json')
    .use('yaml-loader')
    .loader(require.resolve('yaml-loader'))

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
      cacheDirectory: path.join(projectConfig.cacheDir, 'webpack'),
      cacheIdentifier: hash(values)
    }
  }

  function createCSSRule (config, lang, test, loader = null, options = {}) {
    const { css = {}, postcss = {}} = projectConfig.css.loaderOptions
    const baseRule = config.module.rule(lang).test(test)
    const modulesRule = baseRule.oneOf('modules').resourceQuery(/module/)
    const normalRule = baseRule.oneOf('normal')

    applyLoaders(modulesRule, {
      exportOnlyLocals: isServer,
      localIdentName: `[local]_[hash:base64:8]`
    })
    applyLoaders(normalRule, false)

    function applyLoaders (rule, modules) {
      if (!isServer) {
        if (isProd) {
          rule.use('extract-css-loader').loader(CSSExtractPlugin.loader)
        } else {
          rule.use('vue-style-loader').loader(require.resolve('vue-style-loader'))
        }
      }

      rule.use('css-loader')
        .loader(require.resolve('css-loader'))
        .options(Object.assign({
          modules,
          importLoaders: 1,
          sourceMap: !isProd
        }, css))

      rule.use('postcss-loader')
        .loader(require.resolve('postcss-loader'))
        .options({
          sourceMap: !isProd,
          postcssOptions: Object.assign({}, postcss, {
            plugins: (postcss.plugins || []).concat(require('autoprefixer'))
          })
        })

      if (loader) {
        try {
          rule.use(loader).loader(require.resolve(loader)).options(options)
        } catch {
          rule.use(loader).loader(loader).options(options)
        }
      }
    }
  }

  function createEnv () {
    const dataUrl = forwardSlash(path.join(publicPath, assetsDir, 'data', '/'))

    const baseEnv = {
      'process.env.PUBLIC_PATH': JSON.stringify(publicPath),
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
