const { chunk } = require('lodash')
const Queue = require('better-queue')

module.exports = (items, options, taskHandler) => {
  const queue = new Queue(taskHandler, {
    concurrent: options.concurrent || 10
  })

  const chunks = options.chunkSize
    ? chunk(items, options.chunkSize)
    : items

  const total = chunks.length

  for (let i = 0; i < total; i++) {
    queue.push({ id: `data[${i}]`, data: chunks[i] })
  }

  printProgress(0)

  return new Promise((resolve, reject) => {
    let done = 0

    queue.on('task_finish', (id, result, stats) => {
      resetConsoleLine()
      printProgress(done++)
    })

    queue.on('task_failed', (id, err) => {
      reject(`${id} failed with error: ${err}`)
      resetConsoleLine()
      queue.destroy()
    })

    queue.on('drain', () => {
      resetConsoleLine()
      resolve()
    })
  })

  function printProgress (done) {
    const progress = Math.ceil((done / total) * 100)
    process.stdout.write(` ${progress}% ${options.label}`)
  }

  function resetConsoleLine () {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
  }
}

