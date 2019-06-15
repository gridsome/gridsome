const { join, resolve } = require('path')
const { existsSync } = require('fs')

function TypescriptPlugin (api, options) {
  api.chainWebpack(config => {
    config.resolveLoader.modules.prepend(join(__dirname, 'node_modules'))

    options = Object.assign(
      {
        useThreads: require('os').cpus().length > 1,
        tsLoader: {},
        forkTsChecker: {}
      },
      options
    )

    config.module
      .rule('typescript')
      .test(/\.tsx?$/)
      // TODO: implement cache-loader
      .use('babel-loader')
      .loader('babel-loader')
      .end()
      .use('ts-loader')
      .loader('ts-loader')
      .options(
        Object.assign(
          {
            transpileOnly: true,
            appendTsSuffixTo: [/\.vue$/],
            // https://github.com/TypeStrong/ts-loader#happypackmode-boolean-defaultfalse
            happyPackMode: options.useThreads
          },
          options.tsLoader
        )
      )

    config.resolve.extensions.add('.ts')

    config.resolve.alias.set(
      'vue$',
      resolve(process.cwd(), './node_modules/vue/dist/vue.esm.js')
    )

    config
      .plugin('fork-ts-checker-webpack-plugin')
      .use(require('fork-ts-checker-webpack-plugin'), [
        Object.assign(
          {
            vue: true,
            tslint: existsSync(resolve(process.cwd(), 'tslint.json')),
            formatter: 'codeframe',
            // https://github.com/TypeStrong/ts-loader#happypackmode-boolean-defaultfalse
            checkSyntacticErrors: options.useThreads
          },
          options.forkTsChecker
        )
      ])
  })
}

module.exports = TypescriptPlugin
