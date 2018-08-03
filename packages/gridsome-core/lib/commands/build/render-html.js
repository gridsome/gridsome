const cpu = require('./cpu')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const Worker = require('jest-worker').default
const createQueue = require('./create-queue')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (data, outDir) => {
  const timer = hirestime()
  const chunks = chunk(data, 500)

  const worker = new Worker(require.resolve('./workers/html-renderer'), {
    numWorkers: cpu.physical
  })

  await createQueue(chunks, {
    label: 'Rendering HTML',
    concurrent: 100
  }, (task, callback) => {
    worker
      .render({ pages: task.data, context: outDir })
      .then(() => callback())
      .catch(err => callback(err))
  })

  worker.end()

  info(`Render HTML - ${timer(hirestime.S)}s`)
}
