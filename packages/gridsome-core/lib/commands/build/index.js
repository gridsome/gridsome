const path = require('path')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const Service = require('../../Service')
const cpuCount = require('physical-cpu-count')
const { done, info } = require('@vue/cli-shared-utils')

const createRoutes = require('../../codegen/create-routes')
const prepareRenderData = require('./prepare-render-data')

module.exports = async function (api) {
  api.registerCommand('gridsome:build', async (args, rawArgv) => {
    info(`Building for production - ${cpuCount} physical CPUs`)

    const buildTime = hirestime()
    const service = new Service(api)
    const outDir = api.resolve('dist')

    await fs.remove(outDir)
    await service.bootstrap()

    info('Compiling assets...')
    const compileTime = hirestime()
    const clientConfig = require('./create-client-config')(api)
    const serverConfig = require('./create-server-config')(api)
    await compile([clientConfig, serverConfig])
    info(`Compiled assets - ${compileTime(hirestime.S)}s`)

    const dataTime = hirestime()
    const { routes } = await createRoutes(service)
    const data = await prepareRenderData(routes, outDir)

    await require('./render-queries')(service, data)
    await require('./render-html')(data, outDir, cpuCount)
    
    await fs.remove(`${outDir}/manifest`)

    console.log(`\n    🎉 Build completed - ${buildTime(hirestime.S)}s\n`)
  })
}

function compile (config) {
  return new Promise((resolve, reject) => {
    require('webpack')(config, (err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        stats.toJson().errors.forEach((err) => {
          console.error(err)
        })
        return reject(new Error('Failed to compile with errors.'))
      }

      resolve(stats.toJson({ modules: false }))
    })
  })
}





