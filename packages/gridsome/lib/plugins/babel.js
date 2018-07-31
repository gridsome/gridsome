module.exports = (api, options) => {
  require('@vue/cli-plugin-babel')(api, options)

  api.chainWebpack(config => {
    config.module
      .rule('js')
      .use('babel-loader')
      .options({
        presets: ['@vue/app']
      })
  })
}
