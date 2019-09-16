const path = require('path')
const compiler = require('vue-template-compiler')
const { parse } = require('@vue/component-compiler-utils')

class VueComponents {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    api.transpileDependencies([path.resolve(__dirname, 'lib', 'loaders')])

    api.chainWebpack(config => {
      this.createGraphQLRule(config, 'page-query', './lib/loaders/page-query')
      this.createGraphQLRule(config, 'static-query', './lib/loaders/static-query')
    })

    api._app.pages.hooks.parseComponent.for('vue')
      .tap('VueComponentsPlugin', (source, { resourcePath }) => {
        const filename = path.parse(resourcePath).name
        const { customBlocks } = parse({ filename, source, compiler })
        const pageQuery = customBlocks.find(block => block.type === 'page-query')

        return {
          pageQuery: pageQuery ? pageQuery.content : null
        }
      })
  }

  createGraphQLRule (config, type, loader) {
    const re = new RegExp(`blockType=(${type})`)

    config.module.rule(type)
      .resourceQuery(re)
      .use('babel-loader')
      .loader('babel-loader')
      .options({
        presets: [
          require.resolve('@vue/babel-preset-app')
        ]
      })
      .end()
      .use(`${type}-loader`)
      .loader(require.resolve(loader))
  }
}

module.exports = VueComponents
