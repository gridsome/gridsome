const path = require('path')
const { chunk } = require('lodash')
const hirestime = require('hirestime')

module.exports = async (queue, worker, config) => {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 1000)
  const resolve = p => path.resolve(config.outDir, p)

  const templatePath = path.resolve(config.appPath, 'index.server.html')
  const clientManifestPath = resolve(config.clientManifestPath)
  const serverBundlePath = resolve(config.serverBundlePath)

  await Promise.all(chunks.map(chunk => {
    // reduce amount of data sent to worker
    const pages = chunk.map(page => ({
      path: page.path,
      output: page.output,
      hasData: !!page.query
    }))

    return worker
      .renderHtml({
        pages,
        templatePath,
        clientManifestPath,
        serverBundlePath
      })
      .catch(err => {
        throw err
      })
  }))

  console.info(`Render HTML (${totalPages} pages) - ${timer(hirestime.S)}s`)
}
