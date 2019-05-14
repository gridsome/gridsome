module.exports = async (app, defines = {}) => {
  const webpack = require('webpack')

  const clientChain = await app.resolveChainableWebpackConfig()

  clientChain
    .plugin('injections')
    .tap(args => {
      const definitions = args[0]
      args[0] = {
        ...definitions,
        ...defines
      }
      return args
    })

  const [serverConfig, clientConfig] = await Promise.all([
    app.resolveWebpackConfig(true),
    app.resolveWebpackConfig(false, clientChain)
  ])

  return new Promise((resolve, reject) => {
    webpack([clientConfig, serverConfig]).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        const { errors } = stats.toJson()
        return reject(errors[0])
      }

      resolve(stats.toJson({ modules: false }))
    })
  })
}
