const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const { defaultsDeep, camelCase } = require('lodash')
const { internalRE, transformerRE } = require('./index')

const builtInPlugins = [
  'internal://plugins/source-vue'
]

module.exports = (context, options = {}, pkg = {}) => {
  const resolve = p => path.resolve(context, p)
  const configPath = resolve('gridsome.config.js')
  const args = options.args || {}
  const plugins = []
  const config = {}

  const localConfig = fs.existsSync(configPath)
    ? require(configPath)
    : {}

  // use provided plugins instaed of local plugins
  if (Array.isArray(options.plugins)) {
    plugins.push(...options.plugins)
  } else if (Array.isArray(localConfig.plugins)) {
    plugins.push(...localConfig.plugins)
  }

  // add built-in plugins as default
  if (options.useBuiltIn !== false) {
    plugins.unshift(...builtInPlugins)
  }

  config.pkg = options.pkg || resolvePkg(context)
  config.host = args.host || 'localhost'
  config.port = parseInt(args.port) || 8080
  config.plugins = normalizePlugins(plugins)
  config.chainWebpack = localConfig.chainWebpack
  config.transformers = resolveTransformers(config.pkg, localConfig)
  config.outDir = resolve(localConfig.outDir || 'dist')
  config.assetsDir = localConfig.assetsDir || '_assets'
  config.publicPath = localConfig.publicPath || '/'
  config.appPath = path.resolve(__dirname, '../../app')
  config.tmpDir = resolve('src/.temp')
  config.cacheDir = resolve('.cache')
  config.minProcessImageWidth = 500 // TODO: find a better name for this
  config.maxImageWidth = localConfig.maxImageWidth || 1920

  config.siteUrl = localConfig.siteUrl || ''
  config.baseUrl = localConfig.baseUrl || '/'
  config.siteName = localConfig.siteName || path.parse(context).name
  config.titleTemplate = localConfig.titleTemplate || `%s - ${config.siteName}`

  config.manifestsDir = `${config.assetsDir}/manifest`
  config.clientManifestPath = `${config.manifestsDir}/client.json`
  config.serverBundlePath = `${config.manifestsDir}/server.json`

  const icon = typeof localConfig.icon === 'string'
    ? { favicon: localConfig.icon }
    : localConfig.icon || {}

  config.icon = normalizeIconsConfig(localConfig.icon)

  config.scss = {}
  config.sass = {}
  config.less = {}
  config.stylus = {}
  config.postcss = {}

  return config
}

function resolvePkg (context) {
  const pkgPath = path.resolve(context, 'package.json')

  try {
    const content = fs.readFileSync(pkgPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {}

  return {}
}

function normalizePlugins (plugins) {
  return plugins.map((plugin, index) => {
    if (typeof plugin === 'string') {
      plugin = { options: {}, use: plugin }
    }

    const re = /(?:^@?gridsome[/-]|\/)(source|plugin)-([\w-]+)/
    const use = plugin.use.replace(internalRE, '../')
    const uid = crypto.createHash('md5').update(`${use}-${index}`).digest('hex')
    const { isBrowser, isServer, isApp } = resolvePluginType(use)
    const [, type, name] = plugin.use.match(re)

    return defaultsDeep({
      instance: undefined,
      options: {},
      isBrowser,
      isServer,
      isApp,
      name,
      use,
      uid,
      type
    }, plugin)
  })
}

function resolvePluginType (id) {
  const exists = entry => {
    const pluginPath = path.parse(require.resolve(id)).dir
    return /^@gridsome\//.test(id) && process.env.GRIDSOME_DEV
      ? fs.existsSync(`${pluginPath}/src/${entry}`)
      : fs.existsSync(`${pluginPath}/${entry}`)
  }

  const isBrowser = exists('browser.js')
  const isServer = exists('server.js')
  const isApp = exists('app.js')

  return { isBrowser, isServer, isApp }
}

function resolveTransformers (pkg, config) {
  const { dependencies = {}, devDependencies = {}} = pkg
  const deps = Object.keys({
    ...dependencies,
    ...devDependencies
  })

  const result = {}

  for (let id of deps) {
    let matches = id.match(transformerRE)

    if (internalRE.test(id)) {
      id = id.replace(internalRE, '../')
      matches = []
    }

    if (!matches) continue

    // TODO: transformers looks for base config in gridsome.config.js
    // - @gridsome/transformer-remark -> config.transformers.remark
    // - @foo/gridsome-transformer-remark -> config.transformers.remark
    // - gridsome-transformer-foo-bar -> config.transformers.fooBar

    const [, suffix] = matches
    const name = camelCase(suffix)
    const TransformerClass = require(id)
    const options = (config.transformers || {})[name] || {}

    for (const mimeType of TransformerClass.mimeTypes()) {
      result[mimeType] = { TransformerClass, options, name }
    }
  }

  return result
}

function normalizeIconsConfig (config = {}) {
  const res = {}

  const faviconSizes = [16, 32, 96]
  const touchiconSizes = [76, 152, 120, 167, 180]
  const defaultIcon = 'src/favicon.png'
  const icon = typeof config === 'string' ? { favicon: icon } : (config || {})

  res.favicon = typeof icon.favicon === 'string'
    ? { src: icon.favicon, sizes: faviconSizes }
    : Object.assign({}, icon.favicon, {
      sizes: faviconSizes,
      src: defaultIcon
    })

  res.touchicon = typeof icon.touchicon === 'string'
    ? { src: icon.touchicon, sizes: faviconSizes, precomposed: false }
    : Object.assign({}, icon.touchicon, {
      sizes: touchiconSizes,
      src: res.favicon.src,
      precomposed: false
    })

  return res
}
