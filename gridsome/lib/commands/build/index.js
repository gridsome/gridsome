module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const path = require('path')
  const fs = require('fs-extra')
  const hirestime = require('hirestime')
  const Service = require('../../Service')
  const createWorker = require('../utils/createWorker')
  const compileAssets = require('../utils/compileAssets')

  const buildTime = hirestime()
  const service = new Service(context, { args })
  const { config, system, graphql, plugins } = await service.bootstrap()
  const worker = createWorker(config, system.cpus.logical)

  await plugins.callHook('beforeBuild', { context, config })
  await fs.remove(config.outDir)

  const queue = await require('./createRenderQueue')(service)

  // 1. run all GraphQL queries and save results into data.json files
  await plugins.callHook('beforeRenderQueries', { context, config, queue })
  await require('./renderQueries')(queue, graphql, config.cacheDir, system.cpus.logical)

  // 2. compile assets with webpack
  await compileAssets(context, config, plugins)

  // 3. render a static index.html file for each possible route
  await plugins.callHook('beforeRenderHTML', { context, config, queue })
  await require('./renderHtml')(queue, worker, config)

  // 4. process queued images
  await plugins.callHook('beforeProcessImages', { context, config, queue: service.queue })
  await require('./processImages')(service.queue, worker, config)

  // 5. clean up
  await plugins.callHook('afterBuild', { context, config, queue })
  await fs.remove(path.resolve(config.outDir, config.manifestsDir))

  worker.end()

  console.log()
  console.log(`  Done in ${buildTime(hirestime.S)}s`)
  console.log()
}
