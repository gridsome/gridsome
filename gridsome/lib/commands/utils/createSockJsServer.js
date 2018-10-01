const path = require('path')
const http = require('http')
const sockjs = require('sockjs')
const resolvePort = require('./resolvePort')

module.exports = (host, clients, pathPrefix) => new Promise(async resolve => {
  const port = await resolvePort(9000)
  const echo = sockjs.createServer({ log: () => null })
  const server = http.createServer()
  const prefix = path.join(pathPrefix, 'echo')

  echo.on('connection', connection => {
    clients[connection.id] = connection

    connection.on('close', () => {
      delete clients[connection.id]
    })
  })

  echo.installHandlers(server, { prefix })

  server.listen(port, host, () => {
    resolve(`http://${host}:${port}${prefix}`)
  })
})
