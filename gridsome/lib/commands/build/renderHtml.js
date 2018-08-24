const path = require('path')
const { chunk } = require('lodash')
const hirestime = require('hirestime')

module.exports = async (queue, worker, { appPath, outDir }) => {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 1000)

  const templatePath = path.resolve(appPath, 'index.server.html')
  const clientManifestPath = `${outDir}/manifest/client.json`
  const serverBundlePath = `${outDir}/manifest/server.json`

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
