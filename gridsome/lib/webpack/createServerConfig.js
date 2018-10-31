const path = require('path')
const createBaseConfig = require('./createBaseConfig')

const resolve = p => path.resolve(__dirname, p)

module.exports = app => {
  const isProd = process.env.NODE_ENV === 'production'
  const config = createBaseConfig(app, { isProd, isServer: true })
  const { targetDir, serverBundlePath } = app.config

  config.entry('app').add(resolve('../../app/entry.server.js'))

  config.target('node')
  config.externals([/^vue|vue-router$/])
  config.devtool('source-map')

  config.optimization.minimize(false)
  config.output.libraryTarget('commonjs2')

  config.plugin('ssr-server')
    .use(require('./plugins/VueSSRServerPlugin'), [{
      filename: path.relative(targetDir, serverBundlePath)
    }])

  app.dispatchSync('chainWebpack', config, {
    context: app.context,
    isServer: true,
    isProd
  })

  return config
}
