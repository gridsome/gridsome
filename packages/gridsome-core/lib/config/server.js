module.exports = (config) => {
  config
    .entry('app')
    .clear()
    .add(require.resolve('../../app/entry.server.js'))

  config
    .target('node')
    .devtool('source-map')
    .externals([/^(vue|vue-router)$/])

  config.output
    .filename('server-bundle.js')
    .libraryTarget('commonjs2')

  config.optimization
    .minimize(false)

  config
    .plugin('ssr-server')
    .use(require('vue-server-renderer/server-plugin'), [{
      filename: 'manifest/server.json'
    }])
}
