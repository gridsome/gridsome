const cpu = require('./utils/cpu')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const Worker = require('jest-worker').default

module.exports = async (queue, { outDir }) => {
  const timer = hirestime()
  const chunks = chunk(queue.queue, 100)
  const totalAssets = queue.queue.length
  const workerPath = require.resolve('./workers/image-processor')

  const worker = new Worker(workerPath, {
    numWorkers: cpu.logical
  })

  await Promise.all(chunks.map(queue => {
    return worker
      .process({ queue, outDir })
      .catch(err => {
        console.log(err.message)
      })
  }))

  worker.end()

  console.info(`Process images (${totalAssets} images) - ${timer(hirestime.S)}s`)
}
