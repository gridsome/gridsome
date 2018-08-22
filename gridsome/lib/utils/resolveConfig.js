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
    const [, type, name] = plugin.use.match(re)

    // TODO: validate plugin

    return defaultsDeep({
      use: plugin.use.replace(internalRE, '../'),
      uid: crypto.createHash('md5').update(`${plugin.use}-${index}`).digest('hex'),
      instance: undefined,
      options: {},
      name,
      type
    }, plugin)
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
