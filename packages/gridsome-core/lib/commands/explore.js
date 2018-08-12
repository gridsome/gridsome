const Service = require('../Service')
const createGraphQlServer = require('../graphql/createServer')
const { BOOTSTRAP_GRAPHQL } = require('../bootstrap/phases')

module.exports = api => {
  api.registerCommand('gridsome:explore', async (args, rawArgv) => {
    const service = new Service(api.service.context)

    await service.bootstrap(BOOTSTRAP_GRAPHQL)

    return createGraphQlServer(service)
  })
}
