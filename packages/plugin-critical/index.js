const micromatch = require('micromatch')
const Worker = require('jest-worker').default

const normalize = p => p.replace(/\/+$/, '') || '/'

module.exports = function (api, options) {
  api.afterBuild(async ({ queue, config }) => {
    const { outDir: base, pathPrefix, publicPath } = config
    const patterns = options.paths.map(p => normalize(p))

    const pages = queue.filter(page => {
      return micromatch(page.path, patterns).length
    })

    const worker = new Worker(require.resolve('./lib/worker'))

    console.log(`Extract critical CSS (${pages.length} pages)`)

    await Promise.all(pages.map(async ({ htmlOutput }) => {
      try {
        await worker.generate(htmlOutput, {
          ignore: options.ignore,
          width: options.width,
          height: options.height,
          // TODO: remove pathPrefix fallback
          pathPrefix: publicPath || pathPrefix || '/',
          polyfill: options.polyfill,
          base
        })
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
