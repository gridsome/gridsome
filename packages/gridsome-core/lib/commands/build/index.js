const cpu = require('./cpu')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const Service = require('../../Service')
const { info } = require('@vue/cli-shared-utils')

const createRoutes = require('../../codegen/createRoutes')
const prepareRenderData = require('./prepareRenderData')

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
    const clientConfig = require('./createClientConfig')(api)
    const serverConfig = require('./createServerConfig')(api)
    await compile([clientConfig, serverConfig])
    info(`Compile assets - ${compileTime(hirestime.S)}s`)

    await require('./renderQueries')(service, data)
    await require('./renderHtml')(data, outDir)

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
