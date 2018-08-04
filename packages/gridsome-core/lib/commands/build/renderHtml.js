const path = require('path')
const cpu = require('./utils/cpu')
const hirestime = require('hirestime')
const Worker = require('jest-worker').default
const createQueue = require('./createQueue')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (pages, outputDir) => {
  const timer = hirestime()
  const totalPages = pages.length

  const workerPath = require.resolve('./workers/html-renderer')
  const templatePath = path.resolve(__dirname, '../../../app/index.server.html')
  const clientManifestPath = `${outputDir}/manifest/client.json`
  const serverBundlePath = `${outputDir}/manifest/server.json`

  const worker = new Worker(workerPath, {
    numWorkers: cpu.logical
  })

  await createQueue(pages, {
    label: 'Rendering HTML',
    concurrent: cpu.logical,
    chunkSize: 500
  }, (task, callback) => {
    // reduce amount of data sent to worker
    const pages = task.data.map(page => ({
      path: page.path,
      output: page.output,
      query: !!page.query
    }))

    worker
      .render({
        pages,
        templatePath,
        clientManifestPath,
        serverBundlePath
      })
      .then(() => callback())
      .catch(err => callback(err))
  })

  worker.end()

  info(`Render HTML (${totalPages} pages) - ${timer(hirestime.S)}s`)
}
