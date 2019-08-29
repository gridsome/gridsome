const path = require('path')
const fs = require('fs-extra')
const pMap = require('p-map')
const hirestime = require('hirestime')
const { chunk, groupBy } = require('lodash')
const sysinfo = require('./utils/sysinfo')
const executeQueries = require('./graphql/executeQueries')
const createRenderQueue = require('./pages/createRenderQueue')
const { log, info, writeLine } = require('./utils/log')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const createApp = require('./app')
  const app = await createApp(context, { args })
  const { config } = app

  await app.events.dispatch('beforeBuild', { context, config })

  await fs.emptyDir(config.outDir)
  await fs.emptyDir(config.dataDir)

  const renderQueue = createRenderQueue(app)
  const redirects = app.hooks.redirects.call([], renderQueue)
  const queue = await executeQueries(renderQueue, app)

  await writePageData(queue, app)
  await runWebpack(app)
  await renderHTML(queue, app)
  await processFiles(app.assets.files)
  await processImages(app.assets.images, app.config)

  // copy static files
  if (fs.existsSync(config.staticDir)) {
    await fs.copy(config.staticDir, config.outDir)
  }

  await app.events.dispatch('afterBuild', () => ({ context, config, queue, redirects }))

  // clean up
  await fs.remove(config.manifestsDir)
  await fs.remove(config.dataDir)

  log()
  log(`  Done in ${buildTime(hirestime.S)}s`)
  log()

  return app
}

async function writePageData (renderQueue, app) {
  const timer = hirestime()
  const queryQueue = renderQueue.filter(entry => entry.dataOutput)
  const routeIds = groupBy(queryQueue, entry => entry.routeId)
  const meta = new Map()

  let count = 0

  for (const entry of queryQueue) {
    await fs.outputFile(entry.dataOutput, JSON.stringify(entry.data))
  }

  for (const id in routeIds) {
    const entries = routeIds[id]
    const route = app.pages._routes.by('id', id)
    const content = entries.reduce((acc, { path, dataInfo }) => {
      acc[path] = [dataInfo.group, dataInfo.hash]
      return acc
    }, {})

    if (entries.length > 1) {
      const output = path.join(app.config.dataDir, 'route-meta', `${count++}.json`)
      await fs.outputFile(output, JSON.stringify(content))
      meta.set(route.id, output)
    } else {
      meta.set(route.id, content[entries[0].path])
    }
  }

  // re-generate routes with query meta
  await app.codegen.generate('routes.js', meta)

  info(`Write page data (${queryQueue.length + count} files) - ${timer(hirestime.S)}s`)
}

async function runWebpack (app) {
  const compileTime = hirestime()
  const compileAssets = require('./webpack/compileAssets')
  const { removeStylesJsChunk } = require('./webpack/utils')

  if (!process.stdout.isTTY) {
    info(`Compiling assets...`)
  }

  const stats = await compileAssets(app)

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

async function processFiles (files) {
  const timer = hirestime()
  const totalFiles = files.queue.length

  for (const file of files.queue) {
    await fs.copy(file.filePath, file.destPath)
  }

  info(`Process files (${totalFiles} files) - ${timer(hirestime.S)}s`)
}

async function processImages (images, config) {
  const { createWorker } = require('./workers')
  const timer = hirestime()
  const chunks = chunk(images.queue, 25)
  const worker = createWorker('image-processor')
  const totalAssets = images.queue.length
  const totalJobs = chunks.length

  let progress = 0

  writeLine(`Processing images (${totalAssets} images) - 0%`)

  try {
    await pMap(chunks, async queue => {
      await worker.process({
        queue,
        outDir: config.outDir,
        cacheDir: config.imageCacheDir,
        backgroundColor: config.images.backgroundColor
      })

      writeLine(`Processing images (${totalAssets} images) - ${Math.round((++progress) * 100 / totalJobs)}%`)
    }, {
      concurrency: sysinfo.cpus.logical
    })
  } catch (err) {
    worker.end()
    throw err
  }

  worker.end()

  writeLine(`Process images (${totalAssets} images) - ${timer(hirestime.S)}s\n`)
}
