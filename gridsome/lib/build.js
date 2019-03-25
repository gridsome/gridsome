const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const hashSum = require('hash-sum')
const hirestime = require('hirestime')
const sysinfo = require('./utils/sysinfo')
const { chunk, groupBy } = require('lodash')
const { log, error, info } = require('./utils/log')
const { pipe } = require('./utils')

const createApp = require('./app')
const { execute } = require('graphql')
const { createWorker } = require('./workers')
const { createRenderQueue } = require('./app/render-queue')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const app = await createApp(context, { args })
  const { config } = app

  await app.dispatch('beforeBuild', { context, config })

  await fs.remove(config.outDir)
  await fs.ensureDir(config.dataDir)
  await fs.ensureDir(config.outDir)

  const queue = await pipe([
    createRenderQueue,
    createHTMLPaths,
    executeQueries
  ], [], app)

  await writeQueryResults(queue, app)
  await runWebpack(app)
  await renderHTML(queue, app)
  await processFiles(app.queue.files, app.config)
  await processImages(app.queue.images, app.config)

  // copy static files
  if (fs.existsSync(config.staticDir)) {
    await fs.copy(config.staticDir, config.outDir)
  }

  await app.dispatch('afterBuild', () => ({ context, config, queue }))

  // clean up
  await fs.remove(config.manifestsDir)
  await fs.remove(config.dataDir)

  log()
  log(`  Done in ${buildTime(hirestime.S)}s`)
  log()

  return app
}

function createHTMLPaths (renderQueue, app) {
  return renderQueue.map(entry => {
    const segments = entry.path.split('/').filter(segment => !!segment)
    const fileSegments = segments.map(segment => decodeURIComponent(segment))
    const fileName = entry.isIndex ? 'index.html' : `${fileSegments.pop()}.html`

    return {
      ...entry,
      htmlOutput: path.join(app.config.outDir, ...fileSegments, fileName)
    }
  })
}

async function executeQueries (renderQueue, app) {
  const timer = hirestime()
  const context = app.createSchemaContext()
  const groupSize = 500

  let count = 0
  let group = 0

  const res = await pMap(renderQueue, async entry => {
    if (count % (groupSize - 1) === 0) group++
    count++

    const results = entry.query
      ? await execute(app.schema, entry.query, undefined, context, entry.queryContext)
      : {}

    if (results.errors) {
      const relPath = path.relative(app.context, entry.component)
      error(`An error occurred while executing page-query for ${relPath}\n`)
      throw new Error(results.errors[0])
    }

    const data = { data: results.data || null, context: entry.context }
    const hash = hashSum(data)
    const dataInfo = { group, hash }
    const dataOutput = path.join(app.config.assetsDir, 'data', `${group}/${hash}.json`)

    return { ...entry, dataOutput, data, dataInfo }
  }, { concurrency: sysinfo.cpus.physical })

  info(`Execute GraphQL (${count} queries) - ${timer(hirestime.S)}s`)

  return res
}

async function writeQueryResults (renderQueue, app) {
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

  info(`Write query results (${queryQueue.length + count} files) - ${timer(hirestime.S)}s`)
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
