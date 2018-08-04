const hirestime = require('hirestime')
const { info } = require('@vue/cli-shared-utils')

module.exports = async api => {
  const compileTime = hirestime()
  const clientConfig = require('./webpack/createClientConfig')(api)
  const serverConfig = require('./webpack/createServerConfig')(api)

  await compile([clientConfig, serverConfig])

  info(`Compile assets - ${compileTime(hirestime.S)}s`)
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
