class Plugin {
  /**
   * Called when plugins are run.
   */
  apply () {}

  /**
   * Called after config has been resolved
   * and before any plugins are applied.
   */
  async init () {}

  /**
   * Create custom GrapQL root queries.
   * @param  {Store} options.store
   * @return {Object}
   */
  async createSchemaQueries ({ store }) {}

  /**
   * Called after all bootstrap phases.
   */
  async afterBootstrap () {}

  /**
   * Chain webpack config.
   * @param  {ChainedMap} config
   * @param  {String}     options.context
   * @param  {Boolean}    options.isProd
   * @param  {Boolean}    options.isServer
   */
  chainWebpack (config, { context, isProd, isServer }) {}

  /**
   * Called before query data is rendered.
   * @param  {String} options.context
   * @param  {Object} options.config
   * @param  {Array}  options.queue
   */
  async beforeRenderQueries ({ context, config, queue }) {}

  /**
   * Called before static HTML is rendered.
   * @param  {String} options.context
   * @param  {Object} options.config
   * @param  {Array}  options.queue
   */
  async beforeRenderHTML ({ context, config, queue }) {}

  /**
   * Called before build.
   * @param  {String} options.context
   * @param  {Object} options.config
   */
  async beforeBuild ({ context, config }) {}

  /**
   * Called before build.
   * @param  {String} options.context
   * @param  {Object} options.config
   */
  async afterBuild ({ context, config }) {}
}

module.exports = Plugin
