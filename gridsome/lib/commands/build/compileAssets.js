const hirestime = require('hirestime')
const createClientConfig = require('../../webpack/createClientConfig')
const createServerConfig = require('../../webpack/createServerConfig')

module.exports = async (context, options, logger = global.console) => {
  const compileTime = hirestime()

  await compile([
    createClientConfig(context, options).toConfig(),
    createServerConfig(context, options).toConfig()
  ])

  logger.info(`Compile assets - ${compileTime(hirestime.S)}s`)
}

function compile (config) {
  const webpack = require('webpack')

  return new Promise((resolve, reject) => {
    webpack(config).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        return reject(stats.toJson().errors)
      }

      resolve()
    })
  })
}
