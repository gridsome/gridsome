module.exports = async (context, options) => {
  process.env.NODE_ENV = 'production'

  const chalk = require('chalk')
  const Service = require('../Service')
  const resolvePort = require('./utils/resolvePort')
  const createServer = require('./utils/createServer')
  const { BOOTSTRAP_GRAPHQL } = require('../bootstrap')

  const service = new Service(context)
  const { store, schema } = await service.bootstrap(BOOTSTRAP_GRAPHQL)
  const { host, displayHost } = resolveHost(options.host)
  const port = await resolvePort(options.port)
  const app = createServer({ host, store, schema })

  app.listen(port, () => {
    console.log()
    console.log(`  Explore GraphQL data at: ${chalk.cyan(`http://${displayHost}:${port}`)}`)
    console.log()
  })
}
