const express = require('express')
const Service = require('../Service')
const portfinder = require('portfinder')
const configureDevServer = require('./utils/configureDevServer')
const { BOOTSTRAP_GRAPHQL } = require('../bootstrap')

module.exports = api => {
  api.registerCommand('gridsome:explore', async (args, rawArgv) => {
    portfinder.basePort = args.port || process.env.PORT || 8080

    const port = await portfinder.getPortPromise()
    const service = new Service(api.service.context)
    const app = express()

    await service.bootstrap(BOOTSTRAP_GRAPHQL)
    const serverCallback = configureDevServer(app, service)

    app.listen(port, () => {
      console.log()
      serverCallback({ url: `http://localhost:${port}` })
      console.log()
    })
  })
}
