module.exports = async (
  context,
  options = {},
  phase = null
) => {
  const App = require('./App')

  const instance = new App(context, options)

  await instance.bootstrap(phase)

  return instance
}
