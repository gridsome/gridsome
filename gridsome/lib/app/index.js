const App = require('./App')
const { BOOTSTRAP_FULL } = require('../utils/constants')

module.exports = async (
  context,
  options = {},
  phase = BOOTSTRAP_FULL
) => {
  const app = new App(context, options)

  await app.bootstrap(phase)

  return app
}
