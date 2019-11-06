const fs = require('fs-extra')
const { SyncHook, SyncWaterfallHook, AsyncSeriesHook } = require('tapable')
const createClientConfig = require('../webpack/createClientConfig')
const createServerConfig = require('../webpack/createServerConfig')

class Compiler {
  constructor (app) {
    this._app = app

    this.hooks = {
      cacheIdentifier: new SyncWaterfallHook(['identifier']),
      chainWebpack: new AsyncSeriesHook(['chain', 'env']),
      done: new SyncHook(['columns', 'env'])
    }
  }

  async resolveChainableWebpackConfig (isServer = false) {
    const context = this.createContext(isServer)
    const createChainableConfig = isServer
      ? createServerConfig
      : createClientConfig

    const chain = await createChainableConfig(this._app, context)

    await this.hooks.chainWebpack.promise(chain, context)

    return chain
  }

  async resolveWebpackConfig (isServer = false, chain = null) {
    const context = this.createContext(isServer)
    const resolvedChain = chain || await this.resolveChainableWebpackConfig(isServer)
    const configureWebpack = (this._app.plugins._listeners.configureWebpack || []).slice()
    const configFilePath = this._app.resolve('webpack.config.js')
    const merge = require('webpack-merge')

    if (fs.existsSync(configFilePath)) {
      configureWebpack.push(require(configFilePath))
    }

    const config = await configureWebpack.reduce(async (acc, { handler }) => {
      const config = await Promise.resolve(acc)

      if (typeof handler === 'function') {
        return handler(config, context) || config
      }

      if (typeof handler === 'object') {
        return merge(config, handler)
      }

      return config
    }, Promise.resolve(resolvedChain.toConfig()))

    if (config.output.publicPath !== this._app.config.publicPath) {
      throw new Error(
        `Do not modify webpack output.publicPath directly. ` +
        `Use the "pathPrefix" option in gridsome.config.js instead.`
      )
    }

    return config
  }

  createContext (isServer = false) {
    const isProd = process.env.NODE_ENV === 'production'

    return {
      context: this._app.context,
      isServer,
      isClient: !isServer,
      isProd,
      isDev: !isProd
    }
  }
}

module.exports = Compiler
