const path = require('path')
const createBaseConfig = require('./createBaseConfig')

const resolve = p => path.resolve(__dirname, p)

module.exports = (context, options, plugins) => {
  const isProd = process.env.NODE_ENV === 'production'
  const config = createBaseConfig(context, options, { isProd, isServer: true })
  const { targetDir, serverBundlePath } = options

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

  plugins.callHookSync('chainWebpack', config, { context, isProd, isServer: true })

  if (typeof options.chainWebpack === 'function') {
    options.chainWebpack(config, { context, isProd, isServer: true })
  }

  return config
}
