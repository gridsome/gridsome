const hirestime = require('hirestime')

module.exports = async (context, { clientConfig, serverConfig }) => {
  const compileTime = hirestime()

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
