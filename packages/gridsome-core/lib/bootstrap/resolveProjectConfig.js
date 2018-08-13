const path = require('path')
const crypto = require('crypto')
const { defaultsDeep } = require('lodash')

const internalRE = /^internal\:\/\//

const builtInPlugins = [
  'internal://plugins/source-vue'
]

module.exports = (context, { plugins = [], useBuiltIn = true }) => {
  const resolve = p => path.resolve(context, p)
  const configPath = resolve('gridsome.config.js')
  let projectConfig = {}

  try {
    projectConfig = require(configPath)
  } catch (err) {
    throw err
  }

  if (plugins.length) {
    projectConfig.plugins = plugins
  }

  if (useBuiltIn) {
    projectConfig.plugins = builtInPlugins.concat(projectConfig.plugins)
  }

  const config = defaultsDeep({
    tmpDir: resolve('src/.temp'),
    publicDir: resolve('public'),
    transformers: {},
    plugins: []
  }, projectConfig)

  config.plugins = normalizePlugins(config.plugins)

  return config
}

function normalizePlugins (plugins) {
  return plugins.map((plugin, index) => {
    if (typeof plugin === 'string') {
      plugin = { options: {}, use: plugin }
    }

    return defaultsDeep({
      use: plugin.use.replace(internalRE, '../'),
      uid: crypto.createHash('md5').update(`${plugin.use}-${index}`).digest('hex'),
      instance: undefined,
      isSource: undefined,
      isPlugin: undefined,
      options: {}
    }, plugin)
  })
}
