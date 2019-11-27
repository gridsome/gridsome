const path = require('path')
const createBaseConfig = require('./createBaseConfig')

const resolve = p => path.resolve(__dirname, p)

module.exports = async app => {
  const isProd = process.env.NODE_ENV === 'production'
  const config = createBaseConfig(app, { isProd, isServer: true })
  const { outputDir, serverBundlePath } = app.config

  config.entry('app').add(resolve('../../app/entry.server.js'))

  config.target('node')
  config.externals([/^(vue|vue-router|vue-meta)$/])
  config.devtool('source-map')

  config.optimization.minimize(false)
  config.output.libraryTarget('commonjs2')

  config.plugin('vue-server-renderer')
    .use(require('vue-server-renderer/server-plugin'), [{
      filename: path.relative(outputDir, serverBundlePath)
    }])

  return config
}
