module.exports = (api, options) => {
  // If enabled is not overridden from the plugin configuration, set a default.
  options.enabled = (options.enabled === undefined)
    ? process.env.NODE_ENV === 'production'
    : options.enabled
  api.setClientOptions(options)
}
