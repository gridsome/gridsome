module.exports = {
  siteName: 'Gridsome',
  siteUrl: 'https://www.gridsome.org',
  titleTemplate: '%s | Test',

  metadata: {
    someMeta: 'test'
  },

  chainWebpack: config => {
    config.plugin('test-injections-1')
      .use(require('webpack/lib/DefinePlugin'), [{
        'TEST_1': JSON.stringify(process.env.PROD_VARIABLE)
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
