const path = require('path')
const createBaseConfig = require('./createBaseConfig')

const resolve = p => path.resolve(__dirname, p)

module.exports = (options, { isProd }) => {
  const config = createBaseConfig(options, { isProd, isServer: true })

  config
    .entry('app')
      .add(resolve('../app/entry.server.js'))

  config
    .target('node')
    .externals([/^vue|vue-router$/])
    .devtool('source-map')

  config.optimization.minimize(false)

  config.output
    .filename('server-bundle.js')
    .libraryTarget('commonjs2')

  config
    .plugin('ssr-server')
    .use(require('./plugins/VueSSRServerPlugin'), [{
      filename: 'manifest/server.json'
    }])

  return config
}
