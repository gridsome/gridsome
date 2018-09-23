const hirestime = require('hirestime')
const createClientConfig = require('../../webpack/createClientConfig')
const createServerConfig = require('../../webpack/createServerConfig')

module.exports = async (context, config, plugins, defines = {}) => {
  const compileTime = hirestime()

  const clientConfig = createClientConfig(context, config, plugins)
  const serverConfig = createServerConfig(context, config, plugins)
  const payload = { context, config, clientConfig, serverConfig }

  clientConfig
    .plugin('gridsome-endpoints')
      .use(require('webpack/lib/DefinePlugin'), [defines])

  await plugins.callHook('beforeCompileAssets', payload)

  await compile([
    clientConfig.toConfig(),
    serverConfig.toConfig()
  ])

  console.info(`Compile assets - ${compileTime(hirestime.S)}s`)
}

function compile (config) {
  const webpack = require('webpack')

  return new Promise((resolve, reject) => {
    webpack(config).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        stats.toJson().errors.forEach(err => console.error(err))
        return reject(new Error('Failed to compile.'))
      }

      resolve()
    })
  })
}
