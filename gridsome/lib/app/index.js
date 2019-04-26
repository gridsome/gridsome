const App = require('./App')

module.exports = async (
  context,
  options = {},
  phase = null
) => {
  const app = new App(context, options)

  await app.bootstrap(phase)

  return app
}
