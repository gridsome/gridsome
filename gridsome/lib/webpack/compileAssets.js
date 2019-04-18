const createClientConfig = require('./createClientConfig')
const createServerConfig = require('./createServerConfig')

module.exports = async (app, defines = {}) => {
  const clientConfig = await createClientConfig(app)
  const serverConfig = await createServerConfig(app)

  clientConfig
    .plugin('gridsome-endpoints')
    .use(require('webpack/lib/DefinePlugin'), [defines])

  await app.dispatch('beforeCompileAssets', {
    context: app.context,
    config: app.config,
    clientConfig,
    serverConfig
  })

  return compile([
    clientConfig.toConfig(),
    serverConfig.toConfig()
  ])
}

function compile (config) {
  const webpack = require('webpack')

  return new Promise((resolve, reject) => {
    webpack(config).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        const { errors } = stats.toJson()
        return reject(errors[0])
      }

      resolve(stats.toJson({ modules: false }))
    })
  })
}
