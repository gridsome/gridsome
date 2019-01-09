module.exports = {
  siteName: 'Gridsome',
  titleTemplate: '%s | Test',

  chainWebpack: config => {
    config.plugin('test-injections-1')
      .use(require('webpack/lib/DefinePlugin'), [{
        'TEST_1': JSON.stringify('test 1')
      }])
  },

  plugins: [
    {
      use: '~/node_modules/plugin',
      options: {
        foo: 'bar'
      }
    }
  ]
}
