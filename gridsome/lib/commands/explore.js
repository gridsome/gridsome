module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE === 'serve'

  const chalk = require('chalk')
  const Service = require('../Service')
  const resolvePort = require('./utils/resolvePort')
  const createServer = require('./utils/createServer')
  const { BOOTSTRAP_GRAPHQL } = require('../utils')

  const service = new Service(context, { args })
  const { store, schema, config } = await service.bootstrap(BOOTSTRAP_GRAPHQL)
  const port = await resolvePort(config.port)
  const app = createServer({ config, store, schema })
  const url = `http://${config.host}:${port}${createServer.endpoints.explore}`

  app.listen(port, config.host, () => {
    console.log()
    console.log(`  Explore GraphQL data at: ${chalk.cyan(url)}`)
    console.log()
  })
}
