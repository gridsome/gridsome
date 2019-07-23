const Joi = require('joi')
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const dotenv = require('dotenv')
const isRelative = require('is-relative')
const colorString = require('color-string')
const { defaultsDeep, camelCase } = require('lodash')
const { internalRE, transformerRE, SUPPORTED_IMAGE_TYPES } = require('../utils/constants')

const builtInPlugins = [
  path.resolve(__dirname, '../plugins/vue-components'),
  path.resolve(__dirname, '../plugins/vue-pages'),
  path.resolve(__dirname, '../plugins/RedirectsPlugin.js'),
  path.resolve(__dirname, '../plugins/TemplatesPlugin.js')
]

// TODO: use joi to define and validate config schema
module.exports = (context, options = {}) => {
  const env = resolveEnv(context)

  Object.assign(process.env, env)

  const resolve = (...p) => path.join(context, ...p)
  const isProd = process.env.NODE_ENV === 'production'
  const customConfig = options.config || options.localConfig
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

  const localConfig = customConfig
    ? customConfig
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
  config.redirects = normalizeRedirects(localConfig)
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
  config.pagesDir = resolve(localConfig._pagesDir || './src/pages')
  config.templatesDir = resolve(localConfig._templatesDir || './src/templates')
  config.templates = normalizeTemplates(context, config, localConfig)
  config.permalinks = normalizePermalinks(localConfig.permalinks)
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

function normalizeTemplates (context, config, localConfig) {
  const { templates = {}} = localConfig
  const { templatesDir } = config
  const res = {}

  const normalize = (typeName, template, index) => {
    if (typeof template === 'string') {
      return {
        typeName,
        path: template,
        component: path.join(templatesDir, `${typeName}.vue`),
        fieldName: 'path',
        dateField: 'date'
      }
    }

    return {
      typeName,
      path: template.path,
      component: template.component
        ? isRelative(template.component)
          ? path.join(context, template.component)
          : template.component
        : path.join(templatesDir, `${typeName}.vue`),
      fieldName: template.fieldName || ('path' + (index > 0 ? index + 1 : '')),
      dateField: template.dateField || 'date'
    }
  }

  for (const typeName in templates) {
    const options = templates[typeName]

    res[typeName] = Array.isArray(options)
      ? options.map((template, i) => normalize(typeName, template, i))
      : [normalize(typeName, options, 0)]
  }

  return res
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
      name: undefined,
      options: {},
      entries,
      index,
      uid
    })
  })
}

const redirectsSchema = Joi.object()
  .label('Redirect options')
  .keys({
    from: Joi.string().required(),
    to: Joi.string().required(),
    status: Joi.number().integer().default(301)
  })

function normalizeRedirects (config) {
  const redirects = []

  if (Array.isArray(config.redirects)) {
    return config.redirects.map(rule => {
      const { error, value } = Joi.validate(rule, redirectsSchema)

      if (error) {
        throw new Error(error.message)
      }

      return value
    })
  }

  return redirects
}

const permalinksSchema = Joi.object()
  .label('Permalinks config')
  .keys({
    trailingSlash: Joi.boolean()
      .valid(true, false, 'always')
      .default(true),
    slugify: Joi.alternatives()
      .try([
        Joi.object().keys({
          use: Joi.alternatives().try([
            Joi.string(),
            Joi.func()
          ]),
          options: Joi.object()
        }),
        Joi.func()
      ])
      .default({
        use: '@sindresorhus/slugify',
        options: {}
      })
      .allow(false)
  })

function normalizePermalinks (permalinks = {}) {
  const { error, value } = Joi.validate(permalinks, permalinksSchema)

  if (error) {
    throw new Error(error.message)
  }

  if (value.slugify && typeof value.slugify.use === 'string') {
    value.slugify.use = require(value.slugify.use)
  } else if (typeof value.slugify === 'function') {
    value.slugify = { use: value.slugify, options: {}}
  }

  return Object.freeze(value)
}

function resolvePluginEntries (id, context) {
  let dirName = ''

  if (typeof id === 'function') {
    return Object.freeze({
      clientEntry: null,
      serverEntry: id
    })
  } else if (path.isAbsolute(id)) {
    dirName = id
  } else if (id.startsWith('~/')) {
    dirName = path.join(context, id.replace(/^~\//, ''))
  } else {
    dirName = path.dirname(require.resolve(id))
  }

  if (
    fs.existsSync(dirName) &&
    fs.lstatSync(dirName).isFile()
  ) {
    return Object.freeze({
      clientEntry: null,
      serverEntry: dirName
    })
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
    : Object.assign({}, icon.favicon, {
      sizes: faviconSizes,
      src: defaultIcon
    })

  res.touchicon = typeof icon.touchicon === 'string'
    ? { src: icon.touchicon, sizes: touchiconSizes, precomposed: false }
    : Object.assign({}, icon.touchicon, {
      sizes: touchiconSizes,
      src: res.favicon.src,
      precomposed: false
    })

  return res
}
