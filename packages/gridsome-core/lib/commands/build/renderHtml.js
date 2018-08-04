const cpu = require('./cpu')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const Worker = require('jest-worker').default
const createQueue = require('./createQueue')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (data, outDir) => {
  const timer = hirestime()
  const chunks = chunk(data, 500)

  const worker = new Worker(require.resolve('./workers/html-renderer'), {
    numWorkers: cpu.logical
  })

  await createQueue(chunks, {
    label: 'Rendering HTML',
    concurrent: cpu.logical
  }, (task, callback) => {
    // reduce amount of data sent to worker
    const pages = task.data.map(page => ({
      path: page.path,
      output: page.output,
      query: !!page.query
    }))

    worker
      .render({ pages, outDir })
      .then(() => callback())
      .catch(err => callback(err))
  })

  worker.end()

  info(`Render HTML - ${timer(hirestime.S)}s`)
}
