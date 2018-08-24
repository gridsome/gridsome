const { chunk } = require('lodash')
const hirestime = require('hirestime')

module.exports = async (queue, worker, { outDir, minProcessImageWidth }) => {
  const timer = hirestime()
  const chunks = chunk(queue.queue, 100)
  const totalAssets = queue.queue.length

  await Promise.all(chunks.map(queue => {
    return worker
      .processImages({ queue, outDir, minWidth: minProcessImageWidth })
      .catch(err => {
        console.log(err.message)
      })
  }))

  console.info(`Process images (${totalAssets} images) - ${timer(hirestime.S)}s`)
}
