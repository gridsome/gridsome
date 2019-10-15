const chalk = require('chalk')
const createApp = require('./app')
const Server = require('./server/Server')
const resolvePort = require('./server/resolvePort')
const { BOOTSTRAP_PAGES } = require('./utils/constants')
const { prepareUrls } = require('./server/utils')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args }, BOOTSTRAP_PAGES)
  const port = await resolvePort(app.config.port)
  const hostname = app.config.host
  const urls = prepareUrls(hostname, port)
  const server = new Server(app, urls)

  server.listen(port, hostname, err => {
    if (err) throw err

    console.log()
    console.log(`  Explore GraphQL data at: ${chalk.cyan(urls.explore.pretty)}`)
    console.log()
  })
}
