const fs = require('fs-extra')
const micromatch = require('micromatch')
const Worker = require('jest-worker').default

const normalize = p => p.replace(/\/+$/, '') || '/'

module.exports = function (api, options = {}) {
  const { paths, ...workerOptions } = options
  const patterns = (paths || []).map(p => normalize(p))

  api.afterBuild(async ({ queue, config }) => {
    const pages = queue.filter(page => {
      return micromatch(page.path, patterns).length
    })

    const worker = new Worker(require.resolve('./lib/worker'))

    console.log(`Extract critical CSS (${pages.length} pages)`)

    await Promise.all(pages.map(async ({ htmlOutput }) => {
      try {
        const resultHTML = await worker.processHtmlFile(htmlOutput, {
          ...workerOptions,
          publicPath: config.publicPath,
          baseDir: config.outputDir
        })

        await fs.outputFile(htmlOutput, resultHTML)
      } catch (err) {
        worker.end()
        throw err
      }
    }))

    worker.end()
  })
}

module.exports.defaultOptions = () => ({
  paths: ['/'],
  ignore: undefined,
  polyfill: true,
  width: 1300,
  height: 900
})
