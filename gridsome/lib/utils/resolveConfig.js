const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const { defaultsDeep } = require('lodash')
const { internalRE } = require('./index')

const builtInPlugins = [
  'internal://plugins/source-vue'
]

module.exports = (context, options = {}) => {
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

  config.host = args.host || 'localhost'
  config.port = parseInt(args.port) || 8080
  config.plugins = normalizePlugins(plugins)
  config.transformers = localConfig.transformers || {}
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

function normalizePlugins (plugins) {
  return plugins.map((plugin, index) => {
    if (typeof plugin === 'string') {
      plugin = { options: {}, use: plugin }
    }

    const re = /(?:^@?gridsome[/-]|\/)(\w+)-([\w-]+)/
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
