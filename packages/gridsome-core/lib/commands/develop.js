const Service = require('../Service')
const portfinder = require('portfinder')
const configureDevServer = require('./utils/configureDevServer')
const createSockJsServer = require('./utils/createSockJsServer')

module.exports = api => {
  api.registerCommand('gridsome:develop', async (args, rawArgv) => {
    portfinder.basePort = args.port || process.env.PORT || 8080

    const port = await portfinder.getPortPromise()
    const service = new Service(api.service.context)
    const { endpoints } = configureDevServer

    const { clients, schema, store } = await service.bootstrap()

    const sockjsEndpoint = await createSockJsServer(clients)
    const gqlEndpoint = `http://localhost:${port}${endpoints.graphql}`
    const wsEndpoint = `ws://localhost:${port}${endpoints.graphql}`

    api.chainWebpack(config => {
      config
        .plugin('define')
          .tap((args) => [Object.assign({}, ...args, {
            'SOCKJS_ENDPOINT': JSON.stringify(sockjsEndpoint),
            'GRAPHQL_ENDPOINT': JSON.stringify(gqlEndpoint),
            'GRAPHQL_WS_ENDPOINT': JSON.stringify(wsEndpoint)
          })])
    })

    let serverCallback

    api.configureDevServer(app => {
      serverCallback = configureDevServer(app, schema, store)
    })

    api.service
      .run('serve', { ...args, port, open: true }, rawArgv)
      .then(({ url }) => {
        serverCallback({ url })
        console.log()
      })
  })
}
