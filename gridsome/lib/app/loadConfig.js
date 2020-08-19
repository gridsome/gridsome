const path = require('path')
const fs = require('fs-extra')
const Joi = require('@hapi/joi')
const crypto = require('crypto')
const dotenv = require('dotenv')
const isRelative = require('is-relative')
const colorString = require('color-string')
const { deprecate } = require('../utils/deprecate')
const { defaultsDeep, camelCase, isString, isFunction } = require('lodash')
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

  // use provided plugins instead of local plugins
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

  config.context = context
  config.pkg = options.pkg || resolvePkg(context)
  config.host = args.host || localConfig.host || '0.0.0.0'
  config.port = parseInt(args.port || localConfig.port, 10) || undefined
  config.plugins = normalizePlugins(context, plugins)
  config.redirects = normalizeRedirects(localConfig)
  config.transformers = resolveTransformers(config.pkg, localConfig)
  config.pathPrefix = normalizePathPrefix(isProd ? localConfig.pathPrefix : '')
  config._pathPrefix = normalizePathPrefix(localConfig.pathPrefix)
  config.publicPath = config.pathPrefix ? `${config.pathPrefix}/` : '/'
  config.staticDir = resolve('static')

  // TODO: remove outDir before 1.0
  config.outputDir = resolve(localConfig.outputDir || localConfig.outDir || 'dist')
  config.outDir = config.outputDir
  deprecate.property(config, 'outDir', 'The outDir config is renamed to outputDir.')
  if (localConfig.outDir) {
    deprecate(`The outDir config is renamed to outputDir.`, {
      customCaller: ['gridsome.config.js']
    })
  }

  config.assetsDir = path.join(config.outputDir, assetsDir)
  config.imagesDir = path.join(config.assetsDir, 'static')
  config.filesDir = path.join(config.assetsDir, 'files')
  config.dataDir = path.join(config.assetsDir, 'data')
  config.appPath = path.resolve(__dirname, '../../app')
  config.tmpDir = resolve('src/.temp')
  config.cacheDir = resolve('.cache')
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

  config.images = {
    compress: true,
    defaultBlur: 40,
    defaultQuality: 75,
    backgroundColor: null,
    ...localConfig.images
  }

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
  config.metadata = localConfig.metadata || {}

  // TODO: remove before 1.0
  if (localConfig.metaData) {
    deprecate(`The metaData config is renamed to metadata.`, {
      customCaller: ['gridsome.config.js']
    })
    config.metadata = localConfig.metaData
  }

  config.manifestsDir = path.join(config.assetsDir, 'manifest')
  config.clientManifestPath = path.join(config.manifestsDir, 'client.json')
  config.serverBundlePath = path.join(config.manifestsDir, 'server.json')

  config.icon = normalizeIconsConfig(localConfig.icon)

  const localIndex = resolve('src/index.html')
  const fallbackIndex = path.resolve(config.appPath, 'fallbacks', 'index.html')
  config.templatePath = fs.existsSync(localIndex) ? localIndex : fallbackIndex
  config.htmlTemplate = fs.readFileSync(config.templatePath, 'utf-8')

  config.css = defaultsDeep(localConfig.css || {}, css)

  config.prefetch = localConfig.prefetch || {}
  config.preload = localConfig.preload || {}

  config.cacheBusting = typeof localConfig.cacheBusting === 'boolean' ? localConfig.cacheBusting : true

  config.catchLinks = typeof localConfig.catchLinks === 'boolean' ? localConfig.catchLinks : true

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
  let pkg = { dependencies: {}, devDependencies: {}}

  try {
    const content = fs.readFileSync(pkgPath, 'utf-8')
    pkg = Object.assign(pkg, JSON.parse(content))
  } catch (err) {
    // continue regardless of error
  }

  const dependencies = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies
  })

  if (
    !dependencies.includes('gridsome') &&
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

const template = Joi.object()
  .label('Template')
  .keys({
    typeName: Joi.string().required(),
    name: Joi.string().required(),
    path: Joi.alternatives([
      Joi.string().regex(/^\//, 'Template string paths must begin with a slash'),
      Joi.func()
    ]).required(),
    component: Joi.string().required()
  })

function normalizeTemplates (context, config, localConfig) {
  const { templates = {}} = localConfig
  const { templatesDir } = config
  const res = {}

  const normalize = (typeName, options, i = 0) => {
    if (typeof options === 'string' || typeof options === 'function') {
      const { error, value } = Joi.validate({
        typeName,
        path: options,
        component: path.join(templatesDir, `${typeName}.vue`),
        name: 'default'
      }, template)

      if (error) {
        throw new Error(error.message)
      }

      return value
    }

    if (i === 0 && typeof options.name === 'undefined') {
      options.name = 'default'
    }

    if (
      Array.isArray(res[typeName]) &&
      res[typeName].find(tpl => tpl.name === options.name)
    ) {
      throw new Error(
        `A template for "${typeName}" with the name "${options.name}" already exist.`
      )
    }

    const { error, value } = Joi.validate({
      typeName,
      name: options.name,
      path: options.path,
      component: options.component
        ? isRelative(options.component)
          ? path.join(context, options.component)
          : options.component
        : path.join(templatesDir, `${typeName}.vue`)
    }, template)

    if (error) {
      throw new Error(error.message)
    }

    return value
  }

  for (const typeName in templates) {
    const options = templates[typeName]

    res[typeName] = res[typeName] || []

    if (Array.isArray(options)) {
      options.forEach((options, i) => {
        res[typeName].push(normalize(typeName, options, i))
      })
    } else if (isString(options) || isFunction(options)) {
      res[typeName].push(normalize(typeName, options))
    } else {
      throw Error(`Template options for "${typeName}" cannot be an object.`)
    }
  }

  return res
}

function normalizePlugins (context, plugins) {
  return plugins.filter(Boolean).map((plugin, index) => {
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

const redirect = Joi.object()
  .label('Redirect')
  .keys({
    from: Joi.string().required(),
    to: Joi.string().required(),
    status: Joi.number().integer().default(301)
  })

function normalizeRedirects (config) {
  const redirects = []

  if (Array.isArray(config.redirects)) {
    return config.redirects.map(rule => {
      const { error, value } = Joi.validate(rule, redirect)

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
    : Object.assign({}, { src: defaultIcon, sizes: faviconSizes }, icon.favicon)

  res.touchicon = typeof icon.touchicon === 'string'
    ? { src: icon.touchicon, sizes: touchiconSizes, precomposed: false }
    : Object.assign({}, { src: res.favicon.src, sizes: touchiconSizes, precomposed: false }, icon.touchicon)

  return res
}
