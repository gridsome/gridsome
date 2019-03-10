const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const sysinfo = require('./utils/sysinfo')
const { log, error, info } = require('./utils/log')

const createApp = require('./app')
const { execute } = require('graphql')
const { createWorker } = require('./workers')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const app = await createApp(context, { args })
  const { config } = app

  await app.dispatch('beforeBuild', { context, config })
  await fs.ensureDir(config.dataDir)
  await fs.remove(config.outDir)

  const queue = app.pages.genRenderQueue()

  // run all GraphQL queries and save results into json files
  await app.dispatch('beforeRenderQueries', () => ({ context, config, queue }))
  await renderPageQueries(queue, app)

  // write out route metas
  await writeRoutesMeta(app)

  // re-generate routes.js with updated data
  await app.codegen.generate('routes.js')

  // compile assets with webpack
  await runWebpack(app)

  // render a static index.html file for each possible route
  await app.dispatch('beforeRenderHTML', () => ({ context, config, queue }))
  await renderHTML(queue, config)

  // process queued images
  await app.dispatch('beforeProcessAssets', () => ({ context, config, queue: app.queue }))
  await processFiles(app.queue.files, config)
  await processImages(app.queue.images, config)

  // copy static files
  if (fs.existsSync(config.staticDir)) {
    await fs.copy(config.staticDir, config.outDir)
  }

  // clean up
  await app.dispatch('afterBuild', () => ({ context, config, queue }))
  await fs.remove(config.manifestsDir)
  await fs.remove(config.dataDir)

  log()
  log(`  Done in ${buildTime(hirestime.S)}s`)
  log()

  return app
}

const {
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE
} = require('./utils/constants')

async function writeRoutesMeta (app) {
  const routes = app.pages.routes
  const length = routes.length
  const files = {}

  for (let i = 0; i < length; i++) {
    const { type, withPageQuery, renderQueue, metaDataPath } = routes[i]

    if (withPageQuery && renderQueue.length) {
      if (![STATIC_ROUTE, STATIC_TEMPLATE_ROUTE].includes(type)) {
        const metaData = files[metaDataPath] || (files[metaDataPath] = {})
        Object.assign(metaData, renderQueue.reduce((acc, entry) => {
          acc[entry.path] = entry.metaData
          return acc
        }, {}))
      }
    }
  }

  for (const output in files) {
    await fs.outputFile(output, JSON.stringify(files[output]))
  }
}

async function runWebpack (app) {
  const compileTime = hirestime()

  if (!process.stdout.isTTY) {
    info(`Compiling assets...`)
  }

  const stats = await require('./webpack/compileAssets')(app)

  if (app.config.css.split !== true) {
    await removeStylesJsChunk(stats, app.config.outDir)
  }

  info(`Compile assets - ${compileTime(hirestime.S)}s`)
}

async function renderPageQueries (renderQueue, app) {
  const timer = hirestime()
  const context = app.createSchemaContext()
  const queue = renderQueue.filter(entry => entry.withPageQuery)
  const groupSize = 500

  let count = 0
  let group = 0

  await pMap(queue, async entry => {
    if (count % (groupSize - 1) === 0) group++
    count++

    const results = await execute(
      app.schema,
      entry.pageQuery.query,
      undefined,
      context,
      entry.variables
    )

    if (results.errors) {
      const relPath = path.relative(app.context, entry.route.component)
      error(`An error occurred while executing page-query for ${relPath}\n`)
      throw new Error(results.errors[0])
    }

    entry.setData(results, group)

    await fs.outputFile(entry.dataOutput, JSON.stringify(entry.data))
  }, { concurrency: sysinfo.cpus.physical })

  info(`Run GraphQL (${queue.length} queries) - ${timer(hirestime.S)}s`)
}

async function renderHTML (renderQueue, config) {
  const timer = hirestime()
  const totalPages = renderQueue.length
  const chunks = chunk(renderQueue, 350)
  const worker = createWorker('html-writer')

  const { htmlTemplate, clientManifestPath, serverBundlePath } = config

  await Promise.all(chunks.map(async queue => {
    const pages = queue.map(entry => ({
      path: entry.path,
      htmlOutput: entry.htmlOutput,
      dataOutput: entry.dataOutput
    }))

    try {
      await worker.render({
        pages,
        htmlTemplate,
        clientManifestPath,
        serverBundlePath
      })
    } catch (err) {
      worker.end()
      throw err
    }
  }))

  worker.end()

  info(`Render HTML (${totalPages} pages) - ${timer(hirestime.S)}s`)
}

async function processFiles (queue, { outDir }) {
  const timer = hirestime()
  const totalFiles = queue.queue.length

  for (const file of queue.queue) {
    await fs.copy(file.filePath, path.join(outDir, file.destination))
  }

  info(`Process files (${totalFiles} files) - ${timer(hirestime.S)}s`)
}

async function processImages (queue, config) {
  const timer = hirestime()
  const chunks = chunk(queue.queue, 100)
  const worker = createWorker('image-processor')
  const totalAssets = queue.queue.length

  await Promise.all(chunks.map(async queue => {
    try {
      await worker.process({
        queue,
        outDir: config.outDir,
        cacheDir: config.imageCacheDir,
        minWidth: config.minProcessImageWidth,
        backgroundColor: config.images.backgroundColor
      })
    } catch (err) {
      worker.end()
      throw err
    }
  }))

  worker.end()

  info(`Process images (${totalAssets} images) - ${timer(hirestime.S)}s`)
}

// borrowed from vuepress/core/lib/build.js
// webpack fails silently in some cases, appends styles.js to app.js to fix it
// https://github.com/webpack-contrib/mini-css-extract-plugin/issues/85
async function removeStylesJsChunk (stats, outDir) {
  const { children: [clientStats] } = stats
  const styleChunk = clientStats.assets.find(a => /styles(\.\w{8})?\.js$/.test(a.name))
  const appChunk = clientStats.assets.find(a => /app(\.\w{8})?\.js$/.test(a.name))

  if (!styleChunk) return

  const styleChunkPath = path.join(outDir, styleChunk.name)
  const styleChunkContent = await fs.readFile(styleChunkPath, 'utf-8')
  const appChunkPath = path.join(outDir, appChunk.name)
  const appChunkContent = await fs.readFile(appChunkPath, 'utf-8')

  await fs.remove(styleChunkPath)
  await fs.writeFile(appChunkPath, styleChunkContent + appChunkContent)
}
