const fs = require('fs-extra')
const cpu = require('./utils/cpu')
const hirestime = require('hirestime')
const Service = require('../../Service')
const { info } = require('@vue/cli-shared-utils')
const prepareRenderData = require('./prepareRenderData')

module.exports = (api, options) => {
  api.registerCommand('gridsome:build', async (args, rawArgv) => {
    info(`Building for production - ${cpu.physical} physical CPUs`)

    options.outputDir = 'dist/_assets'

    const buildTime = hirestime()
    const outDir = api.resolve('dist')
    const outputDir = api.resolve(options.outputDir)
    const service = new Service(api.service.context)

    await fs.remove(outDir)
    const { routerData, graphql } = await service.bootstrap()
    const { pages } = await prepareRenderData(routerData, outDir, graphql)

    await require('./compileAssets')(api)
    await require('./renderQueries')(pages, graphql)
    await require('./renderHtml')(pages, outputDir)

    await fs.remove(`${outputDir}/manifest`)

    console.log(`\n       Done in ${buildTime(hirestime.S)}s 🎉\n`)
  })
}
