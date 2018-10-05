module.exports = port => {
  const portfinder = require('portfinder')
  portfinder.basePort = parseInt(port, 10) || 8080
  return portfinder.getPortPromise()
}
