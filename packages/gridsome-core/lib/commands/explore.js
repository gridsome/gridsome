const Service = require('../Service')
const createGraphQlServer = require('../graphql/create-server')
const { BOOTSTRAP_SOURCES } = require('../utils/const/bootstrap')

module.exports = api => {
  api.registerCommand('gridsome:explore', async (args, rawArgv) => {
    const service = new Service(api)

    await service.bootstrap(BOOTSTRAP_SOURCES)

    return createGraphQlServer(service)
  })
}
