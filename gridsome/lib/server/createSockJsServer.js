const http = require('http')
const sockjs = require('sockjs')
const resolvePort = require('./resolvePort')

module.exports = ({ config, clients }) => new Promise(async resolve => {
  const port = await resolvePort(9000)
  const echo = sockjs.createServer({ log: () => null })
  const server = http.createServer()
  const prefix = '/echo'
  const url = `http://${config.host}:${port}${prefix}`

  echo.on('connection', connection => {
    clients[connection.id] = connection

    connection.on('close', () => {
      delete clients[connection.id]
    })
  })

  echo.installHandlers(server, { prefix })

  server.listen(port, config.host, () => {
    resolve({ server, port, url })
  })
})
