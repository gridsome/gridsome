const fs = require('fs-extra')
const webpack = require('webpack')
const enhancedResolve = require('enhanced-resolve')
const { SyncHook, SyncWaterfallHook, AsyncSeriesHook } = require('tapable')
const createClientConfig = require('../webpack/createClientConfig')
const createServerConfig = require('../webpack/createServerConfig')

const isProd = process.env.NODE_ENV === 'production'

class Compiler {
  constructor (app) {
    this._app = app
    this._serverConfig = null
    this._clientConfig = null
    this._resolve
    this._resolveSync
    this._compiler = null
    this._buildDependencies = []

    this.hooks = {
      cacheIdentifier: new SyncWaterfallHook(['identifier']),
      chainWebpack: new AsyncSeriesHook(['chain', 'env']),
      done: new SyncHook(['columns', 'env'])
    }
  }

  addBuildDependency (path) {
    if (!this._buildDependencies.includes(path)) {
      this._buildDependencies.push(path)
    }
  }

  async initialize () {
    if (this._resolve) {
      return
    }

    const [serverConfig, clientConfig] = await Promise.all([
      isProd && this.resolveWebpackConfig(true),
      this.resolveWebpackConfig(false)
    ])

    this._serverConfig = serverConfig
    this._clientConfig = clientConfig

    this._resolve = enhancedResolve.create(clientConfig.resolve)
    this._resolveSync = enhancedResolve.create.sync(clientConfig.resolve)
  }

  getClientConfig() {
    return this._clientConfig
  }

  getServerConfig() {
    return this._serverConfig
  }

  getConfigs() {
    return [this.getClientConfig(), this.getServerConfig()].filter(Boolean)
  }

  getCompiler() {
    if (!this._compiler) {
      const configs = this.getConfigs()
      this._compiler = webpack(configs.length === 1 ? configs[0] : configs)
    }
    return this._compiler
  }

  resolve(context, path) {
    try {
      return this._resolve(context, path)
    } catch(err) {
      return undefined
    }
  }

  resolveSync(context, path) {
    try {
      return this._resolveSync(context, path)
    } catch(err) {
      return undefined
    }
  }

  run() {
    return new Promise((resolve, reject) => {
      this.getCompiler().run((err, stats) => {
        delete this._compiler

        if (err) return reject(err)

        if (stats.hasErrors()) {
          const errors = stats.stats
            .flatMap(stats => stats.compilation.errors)
            .map(err => err.error || err)

          return reject(errors[0])
        }

        resolve(stats.toJson({ modules: false }))
      })
    })
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
    const { merge } = require('webpack-merge')

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
