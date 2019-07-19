const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const dotenv = require('dotenv')
const colorString = require('color-string')
const { defaultsDeep, camelCase } = require('lodash')
const { internalRE, transformerRE, SUPPORTED_IMAGE_TYPES } = require('../utils/constants')

const builtInPlugins = [
  path.resolve(__dirname, '../plugins/vue-components'),
  path.resolve(__dirname, '../plugins/vue-pages'),
  path.resolve(__dirname, '../plugins/vue-templates')
]

// TODO: use joi to define and validate config schema
module.exports = (context, options = {}) => {
  const env = resolveEnv(context)

  Object.assign(process.env, env)

  if (options.config) {
    return options.config
  }

  const resolve = (...p) => path.resolve(context, ...p)
  const isProd = process.env.NODE_ENV === 'production'
  const configPath = resolve('gridsome.config.js')
  const localIndex = resolve('src/index.html')
  const args = options.args || {}
  const config = {}
  const plugins = []

  const css = {
    split: false,
    loaderOptions: {
      sass: {
        indentedSyntax: true
      },
      stylus: {
        preferPathResolver: 'webpack'
      }
    }
  }

  const localConfig = options.localConfig
    ? options.localConfig
    : fs.existsSync(configPath)
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
    plugins.unshift({
      use: path.resolve(__dirname, '../plugins/core'),
      options: config
    })
  }

  // add project root as plugin
  plugins.push(context)

  const assetsDir = localConfig.assetsDir || 'assets'

  config.pkg = options.pkg || resolvePkg(context)
  config.host = args.host || localConfig.host || 'localhost'
  config.port = parseInt(args.port || localConfig.port, 10) || 8080
  config.plugins = normalizePlugins(context, plugins)
  config.transformers = resolveTransformers(config.pkg, localConfig)
  config.pathPrefix = normalizePathPrefix(isProd ? localConfig.pathPrefix : '')
  config.publicPath = config.pathPrefix ? `${config.pathPrefix}/` : '/'
  config.staticDir = resolve('static')
  config.outDir = resolve(localConfig.outDir || 'dist')
  config.assetsDir = path.join(config.outDir, assetsDir)
  config.imagesDir = path.join(config.assetsDir, 'static')
  config.filesDir = path.join(config.assetsDir, 'files')
  config.appPath = path.resolve(__dirname, '../../app')
  config.tmpDir = resolve('src/.temp')
  config.cacheDir = resolve('.cache')
  config.dataDir = path.join(config.cacheDir, 'data')
  config.imageCacheDir = resolve('.cache', assetsDir, 'static')
  config.maxImageWidth = localConfig.maxImageWidth || 2560
  config.imageExtensions = SUPPORTED_IMAGE_TYPES
  config.pagesDir = resolve('src/pages')
  config.templatesDir = resolve('src/templates')
  config.componentParsers = []

  config.chainWebpack = localConfig.chainWebpack
  config.configureWebpack = localConfig.configureWebpack
  config.configureServer = localConfig.configureServer

  config.images = { ...localConfig.images }

  if (!colorString.get(config.images.backgroundColor || '')) {
    config.images.backgroundColor = null
  }

  config.runtimeCompiler = localConfig.runtimeCompiler || false

  config.transpileDependencies = Array.isArray(localConfig.transpileDependencies)
    ? localConfig.transpileDependencies.slice()
    : []

  // max cache age for html markup in serve mode
  config.maxCacheAge = localConfig.maxCacheAge || 1000

  config.siteUrl = localConfig.siteUrl || ''
  config.siteName = localConfig.siteName || path.parse(context).name
  config.titleTemplate = localConfig.titleTemplate || `%s - ${config.siteName}`
  config.siteDescription = localConfig.siteDescription || ''
  config.metaData = localConfig.metaData || {}

  config.manifestsDir = path.join(config.assetsDir, 'manifest')
  config.clientManifestPath = path.join(config.manifestsDir, 'client.json')
  config.serverBundlePath = path.join(config.manifestsDir, 'server.json')

  config.icon = normalizeIconsConfig(localConfig.icon)

  config.templatePath = fs.existsSync(localIndex) ? localIndex : path.resolve(config.appPath, 'index.html')
  config.htmlTemplate = fs.readFileSync(config.templatePath, 'utf-8')

  config.css = defaultsDeep(localConfig.css || {}, css)

  return Object.freeze(config)
}

function resolveEnv (context) {
  const env = process.env.NODE_ENV || 'development'
  const envPath = path.resolve(context, '.env')
  const envPathByMode = path.resolve(context, `.env.${env}`)
  const readPath = fs.existsSync(envPathByMode) ? envPathByMode : envPath

  let parsed = {}
  try {
    parsed = dotenv.parse(fs.readFileSync(readPath, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('There was a problem processing the .env file', err)
    }
  }

  return parsed
}

function resolvePkg (context) {
  const pkgPath = path.resolve(context, 'package.json')
  let pkg = { dependencies: {}}

  try {
    const content = fs.readFileSync(pkgPath, 'utf-8')
    pkg = Object.assign(pkg, JSON.parse(content))
  } catch (err) {
    // continue regardless of error
  }

  if (
    !Object.keys(pkg.dependencies).includes('gridsome') &&
    !process.env.GRIDSOME_TEST
  ) {
    throw new Error('This is not a Gridsome project.')
  }

  return pkg
}

function normalizePathPrefix (pathPrefix = '') {
  const segments = pathPrefix.split('/').filter(s => !!s)
  return segments.length ? `/${segments.join('/')}` : ''
}

function normalizePlugins (context, plugins) {
  return plugins.map((plugin, index) => {
    if (typeof plugin !== 'object') {
      plugin = { use: plugin }
    }

    const hash = crypto.createHash('md5')
    const uid = hash.update(`${plugin.use}-${index}`).digest('hex')
    const entries = resolvePluginEntries(plugin.use, context)

    return defaultsDeep(plugin, {
      server: true,
      clientOptions: undefined,
      options: {},
      entries,
      index,
      uid
    })
  })
}

function resolvePluginEntries (id, context) {
  let dirName = ''

  if (typeof id === 'function') {
    return {
      clientEntry: null,
      serverEntry: id
    }
  } else if (path.isAbsolute(id)) {
    dirName = id
  } else if (id.startsWith('~/')) {
    dirName = path.join(context, id.replace(/^~\//, ''))
  } else {
    dirName = path.dirname(require.resolve(id))
  }

  const entryPath = entry => {
    const filePath = path.resolve(dirName, entry)
    return fs.existsSync(filePath) ? filePath : null
  }

  return Object.freeze({
    clientEntry: entryPath('gridsome.client.js'),
    serverEntry: entryPath('gridsome.server.js') || entryPath('index.js')
  })
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
  const defaultIcon = './src/favicon.png'
  const icon = typeof config === 'string' ? { favicon: config } : (config || {})

  res.favicon = typeof icon.favicon === 'string'
    ? { src: icon.favicon, sizes: faviconSizes }
    : Object.assign({}, { src: defaultIcon, sizes: faviconSizes }, icon.favicon)

  res.touchicon = typeof icon.touchicon === 'string'
    ? { src: icon.touchicon, sizes: touchiconSizes, precomposed: false }
    : Object.assign({}, { src: res.favicon.src, sizes: touchiconSizes, precomposed: false }, icon.touchicon)

  return res
}
