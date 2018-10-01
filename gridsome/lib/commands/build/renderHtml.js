const path = require('path')
const { chunk } = require('lodash')
const hirestime = require('hirestime')

module.exports = async (queue, worker, config) => {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 50)

  const { htmlTemplate, clientManifestPath, serverBundlePath } = config

  const onError = err => {
    // worker.end()
    throw err
  }

  await Promise.all(chunks.map(chunk => {
    // reduce amount of data sent to worker
    const pages = chunk.map(page => ({
      path: page.path,
      htmlOutput: page.htmlOutput,
      dataOutput: page.dataOutput
    }))

    return worker
      .renderHtml({
        pages,
        htmlTemplate,
        clientManifestPath,
        serverBundlePath
      }).catch(onError)
  })).catch(onError)

  console.info(`Render HTML (${totalPages} pages) - ${timer(hirestime.S)}s`)
}
