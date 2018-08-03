const cpu = require('./cpu')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const Worker = require('jest-worker').default
const createQueue = require('./create-queue')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (data, outDir) => {
  const timer = hirestime()
  const chunks = chunk(data, cpu.physical * 100)
  const total = chunks.length
  let done = 0

  const worker = new Worker(require.resolve('./workers/html-renderer'), {
    numWorkers: cpu.physical
  })

  printProgress(0)

  await createQueue(chunks, async (task, callback) => {
    worker
      .render({ pages: task.data, context: outDir })
      .then(() => {
        done++

        printProgress(Math.ceil((done / total) * 100))
        callback()
      })
      .catch(err => {
        resetConsoleLine()
        callback(err)
      })
  })

  resetConsoleLine()
  worker.end()

  info(`Render HTML - ${timer(hirestime.S)}s`)
}

function printProgress (progress) {
  if (progress) resetConsoleLine()
  process.stdout.write(`Rendering HTML - ${progress}%`)
}

function resetConsoleLine () {
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
}
