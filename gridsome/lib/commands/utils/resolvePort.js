module.exports = port => {
  const portfinder = require('portfinder')
  portfinder.basePort = parseInt(port) || 8080
  return portfinder.getPortPromise()
}
