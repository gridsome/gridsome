module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'

  const fs = require('fs-extra')
  const hirestime = require('hirestime')
  const Service = require('../../Service')

  const buildTime = hirestime()
  const service = new Service(context, { args })
  const { config, graphql, logger } = await service.bootstrap()

  await fs.remove(config.outDir)

  const queue = await require('./createRenderQueue')(service)

  await require('./compileAssets')(context, config, logger)
  await require('./renderQueries')(queue, graphql, logger)
  await require('./renderHtml')(queue, config.outDir, logger)

  await fs.remove(`${config.outDir}/manifest`)

  console.log()
  console.log(`  Done in ${buildTime(hirestime.S)}s`)
  console.log()
}
