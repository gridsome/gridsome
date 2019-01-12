const path = require('path')

class SassResourcesLoaderPlugin {
  static defaultOptions () {
    return {
      resources: [],
    }
  }

  constructor (api, options) {
    api.chainWebpack(config => {
      this.attachPlugin(
        config.module.rule('scss').oneOf('modules').resourceQuery(/module/),
        options.resources
      )
      this.attachPlugin(
        config.module.rule('scss').oneOf('normal'),
        options.resources
      )
    })
  }

  attachPlugin(rule, resources) {
    rule
      .use('sass-resources-loader')
      .loader('sass-resources-loader')
      .options({ resources })
  }
}

module.exports = SassResourcesLoaderPlugin
