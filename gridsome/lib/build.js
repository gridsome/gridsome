const path = require('path')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const { chunk, groupBy } = require('lodash')
const { log, info } = require('./utils/log')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const createApp = require('./app')
  const app = await createApp(context, { args })
  const { config } = app

  await app.events.dispatch('beforeBuild', { context, config })

  await fs.remove(config.outDir)
  await fs.remove(config.dataDir)
  await fs.ensureDir(config.dataDir)
  await fs.ensureDir(config.outDir)

  const queue = await createRenderQueue(app)

  await writePageData(queue, app)
  await runWebpack(app)
  await renderHTML(queue, app)
  await processFiles(app.queue.files, app.config)
  await processImages(app.queue.images, app.config)

  // copy static files
  if (fs.existsSync(config.staticDir)) {
    await fs.copy(config.staticDir, config.outDir)
  }

  await app.events.dispatch('afterBuild', () => ({ context, config, queue }))

  // clean up
  await fs.remove(config.manifestsDir)
  await fs.remove(config.dataDir)

  log()
  log(`  Done in ${buildTime(hirestime.S)}s`)
  log()

  return app
}

function createRenderQueue (app) {
  return new Promise((resolve, reject) => {
    app.hooks.createRenderQueue.callAsync([], app, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

async function writePageData (renderQueue, app) {
  const timer = hirestime()
  const queryQueue = renderQueue.filter(entry => entry.dataOutput)
  const routes = groupBy(queryQueue, entry => entry.route)
  const meta = {}

  let count = 0

  for (const entry of queryQueue) {
    if (!entry.dataOutput) continue
    await fs.outputFile(entry.dataOutput, JSON.stringify(entry.data))
  }

  for (const route in routes) {
    const entries = routes[route]
    const content = entries.reduce((acc, { path, dataInfo }) => {
      acc[path] = [dataInfo.group, dataInfo.hash]
      return acc
    }, {})

    if (entries.length > 1) {
      const output = path.join(app.config.dataDir, 'route-meta', `${count++}.json`)
      await fs.outputFile(output, JSON.stringify(content))
      meta[route] = output
    } else {
      meta[route] = content[entries[0].path]
    }
  }

  // re-generate routes with query meta
  await app.codegen.generate('routes.js', meta)

  info(`Write page data (${queryQueue.length + count} files) - ${timer(hirestime.S)}s`)
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

async function renderHTML (renderQueue, app) {
  const { createWorker } = require('./workers')
  const timer = hirestime()
  const worker = createWorker('html-writer')
  const { htmlTemplate, clientManifestPath, serverBundlePath } = app.config

  await Promise.all(chunk(renderQueue, 350).map(async pages => {
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

  info(`Render HTML (${renderQueue.length} files) - ${timer(hirestime.S)}s`)
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
  const { createWorker } = require('./workers')
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
