const { BOOTSTRAP_FULL } = require('../utils/constants')

module.exports = async (
  context,
  options = {},
  phase = BOOTSTRAP_FULL
) => {
  const App = require('./App')

  const instance = new App(context, options)

  await instance.bootstrap(phase)

  return instance
}
