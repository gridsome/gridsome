const path = require('path')
const cpu = require('./utils/cpu')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const Worker = require('jest-worker').default
const { info } = require('@vue/cli-shared-utils')

module.exports = async (queue, outputDir) => {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 1000)

  const workerPath = require.resolve('./workers/html-renderer')
  const templatePath = path.resolve(__dirname, '../../../app/index.server.html')
  const clientManifestPath = `${outputDir}/manifest/client.json`
  const serverBundlePath = `${outputDir}/manifest/server.json`

  const worker = new Worker(workerPath, {
    numWorkers: cpu.logical
  })

  await Promise.all(chunks.map(chunk => {
    // reduce amount of data sent to worker
    const pages = chunk.map(page => ({
      path: page.path,
      output: page.output,
      hasData: !!page.query
    }))

    return worker.render({
      pages,
      templatePath,
      clientManifestPath,
      serverBundlePath
    }).catch(err => {
      throw err
    })
  }))

  worker.end()

  info(`Render HTML (${totalPages} pages) - ${timer(hirestime.S)}s`)
}
