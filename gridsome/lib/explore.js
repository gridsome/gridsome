const chalk = require('chalk')
const createApp = require('./app')
const { BOOTSTRAP_PAGES } = require('./utils/constants')
const createExpressServer = require('./server/createExpressServer')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'serve'

  const app = await createApp(context, { args }, BOOTSTRAP_PAGES)
  const server = await createExpressServer(app, { withExplorer: true })

  server.app.listen(server.port, server.host, () => {
    console.log()
    console.log(`  Explore GraphQL data at: ${chalk.cyan(server.url.explore)}`)
    console.log()
  })
}
