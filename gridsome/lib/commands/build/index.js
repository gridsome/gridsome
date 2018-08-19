module.exports = async (context, options) => {
  process.env.NODE_ENV = 'production'

  const path = require('path')
  const fs = require('fs-extra')
  const hirestime = require('hirestime')
  const Service = require('../../Service')

  const buildTime = hirestime()
  const outDir = path.resolve(context, 'dist')
  const service = new Service(context)

  await fs.remove(outDir)
  const { routerData, graphql, logger } = await service.bootstrap()
  const queue = await require('./createRenderQueue')(routerData, outDir, graphql)

  await require('./compileAssets')(context, options, logger)
  await require('./renderQueries')(queue, graphql, logger)
  await require('./renderHtml')(queue, outDir, logger)

  await fs.remove(`${outDir}/manifest`)

  console.log()
  console.log(`  Done in ${buildTime(hirestime.S)}s`)
  console.log()
}
