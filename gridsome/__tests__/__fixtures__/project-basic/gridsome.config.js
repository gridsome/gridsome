module.exports = {
  siteName: 'Gridsome',
  siteUrl: 'https://www.gridsome.org',
  titleTemplate: '%s | Test',

  chainWebpack: config => {
    config.plugin('test-injections-1')
      .use(require('webpack/lib/DefinePlugin'), [{
        'TEST_1': JSON.stringify('test 1')
      }])
  },

  plugins: [
    {
      use: '~/plugin',
      options: {
        foo: 'bar'
      }
    }
  ]
}
