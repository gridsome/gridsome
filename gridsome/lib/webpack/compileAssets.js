module.exports = async (app, defines = {}) => {
  const webpack = require('webpack')

  const clientChain = await app.compiler.resolveChainableWebpackConfig()

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
    app.compiler.resolveWebpackConfig(true),
    app.compiler.resolveWebpackConfig(false, clientChain)
  ])

  return new Promise((resolve, reject) => {
    webpack([clientConfig, serverConfig]).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        const errors = stats.stats
          // .flatMap(stats => stats.compilation.errors) only exists in Node v11+
          .map(stats => stats.compilation.errors)
          .reduce((acc, errors) => acc.concat(errors), [])
          .map(err => err.error || err)

        return reject(errors[0])
      }

      resolve(stats.toJson({ modules: false }))
    })
  })
}
