const asserts = require('./asserts')
const checks = require('./checks')
const config = require('./configstore')
const install = require('./install')

module.exports = {
  ...asserts,
  ...checks,
  ...install,
  config
}
