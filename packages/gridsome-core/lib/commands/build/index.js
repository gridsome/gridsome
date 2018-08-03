const path = require('path')
const cpu = require('./cpu')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const Service = require('../../Service')
const cpuCount = require('physical-cpu-count')
const { done, info } = require('@vue/cli-shared-utils')

const createRoutes = require('../../codegen/create-routes')
const prepareRenderData = require('./prepare-render-data')

module.exports = api => {
  api.registerCommand('gridsome:build', async (args, rawArgv) => {
    
    info(`Building for production - ${cpu.physical} physical CPUs`)

    const buildTime = hirestime()
    const service = new Service(api)
    const outDir = api.resolve('dist')

    await fs.remove(outDir)
    await service.bootstrap()

    const { routes } = await createRoutes(service)
    const data = await prepareRenderData(routes, outDir)

    const compileTime = hirestime()
    const clientConfig = require('./create-client-config')(api)
    const serverConfig = require('./create-server-config')(api)
    await compile([clientConfig, serverConfig])
    info(`Build production assets - ${compileTime(hirestime.S)}s`)

    await require('./render-queries')(service, data)
    await require('./render-html')(data, outDir)
    
    await fs.remove(`${outDir}/manifest`)

    console.log(`\n       Done in ${buildTime(hirestime.S)}s 🎉\n`)
  })
}

function compile (config) {
  const webpack = require('webpack')

  return new Promise((resolve, reject) => {
    webpack(config).run((err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        return reject(stats.toJson().errors)
      }

      resolve()
    })
  })
}





