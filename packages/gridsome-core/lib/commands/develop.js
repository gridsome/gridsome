const Service = require('../Service')
const createGraphQLServer = require('../graphql/createServer')

module.exports = api => {
  api.registerCommand('gridsome:develop', async (args, rawArgv) => {
    const service = new Service(api)

    await service.bootstrap()

    const { sockjsEndpoint, gqlEndpoint, wsEndpoint } = await createGraphQLServer(service)

    api.chainWebpack((config) => {
      config
        .plugin('define')
          .tap((args) => [Object.assign({}, ...args, {
            'SOCKJS_ENDPOINT': JSON.stringify(sockjsEndpoint),
            'GRAPHQL_ENDPOINT': JSON.stringify(gqlEndpoint),
            'GRAPHQL_WS_ENDPOINT': JSON.stringify(wsEndpoint)
          })])
    })

    api.service.run('serve', { ...args, open: true }, rawArgv)
  })
}
