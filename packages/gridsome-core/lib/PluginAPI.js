const { info, warn, error } = require('@vue/cli-shared-utils')

module.exports = class PluginAPI {
  constructor (service, plugin) {
    this.service = service
    this.plugin = plugin
    this.namespace = plugin.uid

    this.info = message => info(message, plugin.id)
    this.warn = message => warn(message, plugin.id)
    this.error = message => error(message, plugin.id)
  }

  client (isClient) {
    this.plugin.client = isClient
  }

  resolve (path) {
    return this.service.resolve(path)
  }

  /**
   * Set a namespace that will be used as prefix for node types etc.
   * @param {String} namespace
   */
  setNamespace (namespace) {
    this.namespace = namespace
  }

  addSource (id, handler) {
    this.service.sources[id] = handler
  }

  addTransformer (id, options) {
    this.service.transformers[id] = options
  }

  //
  // Make some APIs from Vue CLI available for Gridsome plugins
  //

  chainWebpack (fn) {
    // TODO: this.service.chainWebpack(fn)
  }

  configureWebpack (fn) {
    // TODO: this.service.configureWebpack(fn)
  }

  configureDevServer (fn) {
    // TODO: this.service.configureDevServer(fn)
  }
}
