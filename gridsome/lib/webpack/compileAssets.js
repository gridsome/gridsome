const hirestime = require('hirestime')
const createClientConfig = require('./createClientConfig')
const createServerConfig = require('./createServerConfig')

module.exports = async (app, defines = {}) => {
  const compileTime = hirestime()

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
