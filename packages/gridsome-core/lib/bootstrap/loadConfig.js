const fs = require('fs-extra')

module.exports = service => {
  const configPath = service.resolve('gridsome.config.js')
  const hasConfig = fs.existsSync(configPath)

  service.config = Object.assign({
    tmpDir: service.resolve('src/.temp'),
    publicDir: service.resolve('public'),
    plugins: []
  }, hasConfig ? require(configPath) : {})

  // insert internal plugins
  service.config.plugins.splice(0, 0, ...[
    'internal://plugins/source-vue',
    'internal://plugins/transformer-json',
    'internal://plugins/transformer-yaml'
  ])
}
