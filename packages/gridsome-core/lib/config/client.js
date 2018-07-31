module.exports = (config) => {
  config.node.merge({
    global: false
  })

  if (process.env.NODE_ENV === 'production') {
    config.plugin('ssr-client')
      .use(require('vue-server-renderer/client-plugin'), [{
        filename: 'manifest/client.json'
      }])

    // disable DEVELOPMENT to remove unnecessary
    // code from production build
    config.plugin('define')
      .tap((args) => [Object.assign({}, ...args, {
        'process.env.GRIDSOME_DEV': false
      })])

    config
      .plugin('optimize-css')
      .use(require('optimize-css-assets-webpack-plugin'), [{
        canPrint: false,
        cssProcessorOptions: {
          safe: true,
          autoprefixer: { disable: true },
          mergeLonghand: false
        }
      }])
  }
}
