const path = require('path')
const glob = require('globby')
const fs = require('fs-extra')
const hash = require('hash-sum')
const { pick } = require('lodash')
const Config = require('webpack-chain')
const { forwardSlash } = require('../utils')
const { VueLoaderPlugin } = require('vue-loader')
const createHTMLRenderer = require('../server/createHTMLRenderer')
const CSSExtractPlugin = require('mini-css-extract-plugin')

const resolve = (p, c) => path.resolve(c || __dirname, p)
const resolveExists = (path) => fs.existsSync(path) ? path : false
const gridsomeEnv = () => {
  return pick(process.env, Object.keys(process.env).filter(key => key.startsWith('GRIDSOME_')))
}
const hasCoreJS = (root) => {
  const pkgPath = path.join(root, 'package.json')
  const pkg = fs.existsSync(pkgPath) ? require(pkgPath) : {}
  const { dependencies, devDependencies } = pkg
  return Object.keys({ ...dependencies, ...devDependencies }).includes('core-js')
}

module.exports = (app, { isProd, isServer }) => {
  const { config: projectConfig } = app
  const { publicPath } = projectConfig
  const assetsDir = path.relative(projectConfig.outputDir, projectConfig.assetsDir)
  const config = new Config()

  const useHash = isProd && !process.env.GRIDSOME_TEST && projectConfig.cacheBusting
  const filename = `[name]${useHash ? '.[contenthash:8]' : ''}.js`
  const assetname = `[name]${useHash ? '.[hash:8]' : ''}[ext]`
  const inlineLimit = 10000

  config.name(isServer ? 'server' : 'client')
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
    .merge(['.js', '.vue'])
    .end()
    .plugin('core-js-resolver')
    .use(require('./plugins/CoreJSResolver'), [{
      includePaths: [
        projectConfig.appCacheDir,
        !hasCoreJS(projectConfig.context) ? projectConfig.context : ''
      ].filter(Boolean)
    }])

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
    .use('vue-loader')
    .loader(require.resolve('vue-loader'))
    .options({
      compilerOptions: {
        whitespace: 'condense',
        modules: [
          require('./modules/html')(),
          require('./modules/assets')()
        ]
      }
    })

  // js

  ;['js', 'ts'].forEach((loader) => {
    const testRE = new RegExp(`.${loader}x?$`)
    const vueRE = new RegExp(`.vue.${loader}x?$`)
    const clientRE = new RegExp(`gridsome.client.${loader}$`)

    const rule = config.module.rule(loader)
      .test(testRE)
      .exclude
        .add(filepath => {
          if (vueRE.test(filepath)) {
            return false
          }

          if (clientRE.test(filepath)) {
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
          ]
        })
        .end()

    if (loader === 'ts') {
      rule.use('esbuild-loader')
        .loader(require.resolve('esbuild-loader'))
        .options({
          loader,
          target: 'esnext',
          implementation: require('esbuild')
        })
    }
  })

  // css

  const postcssConfigFiles = glob.sync(
    ['.postcssrc?({.js,.yaml,.json})', 'postcss.config.js'],
    {
      cwd: fs.existsSync(projectConfig.context)
        ? projectConfig.context
        : process.cwd()
    }
  )

  ;[
    ['css', /\.css$/],
    ['postcss', /\.p(ost)?css$/],
    ['scss', /\.scss$/, 'sass-loader'],
    ['sass', /\.sass$/, 'sass-loader'],
    ['less', /\.less$/, 'less-loader'],
    ['stylus', /\.styl(us)?$/, 'stylus-loader']
  ].forEach(([lang, test, loader = null]) => {
    const { loaderOptions } = projectConfig.css
    const { css, postcss = {} } = loaderOptions
    const { postcssOptions = {} } = postcss
    const baseRule = config.module.rule(lang).test(test)
    const modulesRule = baseRule.oneOf('modules').resourceQuery(/module/)
    const normalRule = baseRule.oneOf('normal')

    for (const rule of [modulesRule, normalRule]) {
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
          modules: rule === modulesRule
            ? { exportOnlyLocals: isServer, localIdentName: `[local]_[hash:base64:8]` }
            : false,
          importLoaders: loader ? 2 : 1,
          sourceMap: !isProd
        }, css))

      rule.use('postcss-loader')
        .loader(require.resolve('postcss-loader'))
        .options({
          sourceMap: !isProd,
          ...postcss,
          postcssOptions: !postcssConfigFiles.length
            ? {
              ...postcssOptions,
              plugins: [...(postcssOptions.plugins || []), require('autoprefixer')]
            }
            : {}
        })

      if (loader) {
        try {
          rule.use(loader).loader(require.resolve(loader)).options(loaderOptions[lang])
        } catch {
          rule.use(loader).loader(loader).options(loaderOptions[lang])
        }
      }
    }
  })

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

  if (process.stdout.isTTY) {
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
    .use(require('webpack/lib/DefinePlugin'), [{
      'process.env.PUBLIC_PATH': JSON.stringify(publicPath),
      'process.env.DATA_URL': JSON.stringify(forwardSlash(path.join(publicPath, assetsDir, 'data', '/'))),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || ''),
      'process.env.SOCKJS_ENDPOINT': JSON.stringify('/___echo'),
      'process.env.GRAPHQL_ENDPOINT': JSON.stringify('/___graphql'),
      'process.isClient': !isServer,
      'process.isServer': isServer,
      'process.isProduction': process.env.NODE_ENV === 'production',
      'process.isStatic': process.env.GRIDSOME_MODE === 'static',
      // add environment variables starting with GRIDSOME_ to process.env
      ...Object.entries(gridsomeEnv()).reduce((acc, [key, value]) => {
        acc[`process.env.${key}`] = ['boolean', 'number'].includes(typeof value) ? value : JSON.stringify(value)
        return acc
      }, {})
    }])

  if (isProd && !isServer) {
    config.plugin('extract-css')
      .use(CSSExtractPlugin, [{
        filename: `${assetsDir}/css/styles${useHash ? '.[contenthash:8]' : ''}.css`
      }])
  }

  // dev serveer

  if (!isProd) {
    config.devServer.port(projectConfig.port)
    config.devServer.host(projectConfig.host)
    config.devServer.historyApiFallback(true)
    config.devServer.hot(true)

    config.devServer.merge({
      server: projectConfig.https ? 'https' : 'http',
      client: {
        overlay: true
      }
    })
  }

  // cache

  if (projectConfig.cache) {
    config.merge({
      cache: {
        type: 'filesystem',
        version: hash(
          app.compiler.hooks.cacheIdentifier.call({
            'gridsome': require('../../package.json').version,
            'vue-loader': require('vue-loader/package.json').version,
            'context': app.context,
            'env': gridsomeEnv()
          })
        ),
        buildDependencies: {
          config: [
            (app.config.chainWebpack || app.config.configureWebpack)
              ? app.config.configPath
              : undefined,
            ...app.compiler._buildDependencies,
            resolveExists(path.join(app.context, 'webpack.config.js'))
          ].filter(Boolean)
        }
      }
    })
  }

  // test

  if (process.env.GRIDSOME_TEST) {
    config.plugins.delete('progress')
    config.merge({ cache: true })
  }

  return config
}
