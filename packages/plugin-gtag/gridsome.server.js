module.exports = (api, options) => {
  // If enabled is not overridden from the plugin configuration, set a default.
  options.enabled = options.enabled ?? process.env.NODE_ENV === 'production'
  api.setClientOptions(options)
}
