const crypto = require('crypto')
const PluginAPI = require('../PluginAPI')
const { defaultsDeep } = require('lodash')

const internalRE = /^internal\:\/\//

module.exports = async service => {
  service.plugins = Array.isArray(service.config.plugins)
    ? service.config.plugins.map(normalize).filter(plugin => !!plugin.use)
    : []

  for (let i = 0, l = service.plugins.length; i < l; i++) {
    const plugin = service.plugins[i]
    const use = plugin.use.match(internalRE)
      ? plugin.use.replace(internalRE, '../')
      : plugin.use

    plugin.uid = uid(use, i)
    plugin.api = new PluginAPI(service, plugin)

    try {
      const func = require(use)
      const options = defaultsDeep(plugin.options, func.defaultOptions)
      await func(plugin.api, options)
    } catch (err) {}
  }
}

function normalize (plugin) {
  return typeof plugin === 'string'
    ? { use: plugin, client: true, options: {}}
    : { client: true, options: {}, ...plugin }
}

function uid (prefix, index) {
  return crypto.createHash('md5').update(`${prefix}-${index}`).digest('hex')
}
