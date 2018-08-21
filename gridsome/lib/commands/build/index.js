module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'

  const fs = require('fs-extra')
  const hirestime = require('hirestime')
  const Service = require('../../Service')
  const createClientConfig = require('../../webpack/createClientConfig')
  const createServerConfig = require('../../webpack/createServerConfig')

  const buildTime = hirestime()
  const service = new Service(context, { args })
  const { config, graphql, plugins } = await service.bootstrap()

  await plugins.callHook('beforeBuild', { context, config })
  await fs.remove(config.outDir)

  const queue = await require('./createRenderQueue')(service)

  // 1. compile assets with webpack
  const clientConfig = createClientConfig(context, config, plugins)
  const serverConfig = createServerConfig(context, config, plugins)
  await require('./compileAssets')(context, { clientConfig, serverConfig })

  // 2. run all GraphQL queries and save results into data.json files
  await plugins.callHook('beforeRenderQueries', { context, config, queue })
  await require('./renderQueries')(queue, graphql)

  // 3. render a static index.html file for each possible route
  await plugins.callHook('beforeRenderHTML', { context, config, queue })
  await require('./renderHtml')(queue, config)

  // 4. clean up
  await plugins.callHook('afterBuild', { context, config })
  await fs.remove(`${config.outDir}/manifest`)

  console.log()
  console.log(`  Done in ${buildTime(hirestime.S)}s`)
  console.log()
}
