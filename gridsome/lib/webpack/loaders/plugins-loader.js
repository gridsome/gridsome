const { camelCase } = require('lodash')

module.exports = async function (source, map) {
  const { config } = process.GRIDSOME
  const isServer = this.target === 'node'
  const isBrowser = this.target === 'web'

  const plugins = config.plugins
    .filter(plugin => {
      if (plugin.isApp) return true
      if (isServer) return plugin.isServer === true
      if (isBrowser) return plugin.isBrowser === true
      return false
    })
    .map(plugin => {
      const entry = plugin.isApp
        ? 'app.js'
        : plugin.isServer
          ? 'server.js'
          : 'browser.js'

      return {
        id: camelCase(`plugin ${plugin.uid}`),
        options: plugin.options,
        module: /^@gridsome\//.test(plugin.use) && process.env.GRIDSOME_DEV
          ? `${plugin.use}/src/${entry}`
          : `${plugin.use}/${entry}`
      }
    })

  let res = ''

  res += plugins.map(({ id, module }) => {
    return `import ${id} from '${module}'`
  }).join('\n')

  res += `\n\nexport default [\n${
    plugins.map(generatePlugin).join(',\n')
  }\n]\n`

  return res
}

function generatePlugin (plugin) {
  let res = ''

  // get options from a file if an absolute path is given
  const options = typeof plugin.options === 'string'
    ? `require(${JSON.stringify(plugin.options)})`
    : JSON.stringify(plugin.options)

  res += `  {\n`
  res += `    PluginClass: ${plugin.id},\n`
  res += `    options: ${options}\n`
  res += `  }`

  return res
}
