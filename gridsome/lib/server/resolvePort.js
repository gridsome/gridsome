const portfinder = require('portfinder')

module.exports = port => {
  if (port) return Promise.resolve(port)

  portfinder.basePort = 8080

  return portfinder.getPortPromise()
}
