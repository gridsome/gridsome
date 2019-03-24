const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const hashSum = require('hash-sum')
const hirestime = require('hirestime')
const sysinfo = require('./utils/sysinfo')
const { chunk, pick, groupBy } = require('lodash')
const { log, error, info } = require('./utils/log')

const createApp = require('./app')
const { execute } = require('graphql')
const { createWorker } = require('./workers')
const { createRenderQueue } = require('./app/pages')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const app = await createApp(context, { args })
  const { config } = app

  await app.dispatch('beforeBuild', { context, config })
  await fs.ensureDir(config.dataDir)
  await fs.remove(config.outDir)

  let queue = createRenderQueue(app)

  // run all GraphQL queries and save results into json files
  await app.dispatch('beforeRenderQueries', () => ({ context, config, queue }))
  queue = await renderPageQueries(queue, app)

  // write out route metas and new routes
  await createRoutesMeta(app, queue)

  // compile assets with webpack
  await runWebpack(app)

  // render a static index.html file for each possible route
  await app.dispatch('beforeRenderHTML', () => ({ context, config, queue }))
  queue = await renderHTML(queue, config)

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

async function renderPageQueries (renderQueue, app) {
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

    results.context = entry.context

    const hash = hashSum(results)
    const dataOutput = path.join(app.config.assetsDir, 'data', `${group}/${hash}.json`)
    const dataMeta = { group, hash }

    await fs.outputFile(dataOutput, JSON.stringify(results))

    return { ...entry, dataMeta, dataOutput }
  }, { concurrency: sysinfo.cpus.physical })

  info(`Run GraphQL (${count} queries) - ${timer(hirestime.S)}s`)

  return res
}

async function createRoutesMeta (app, renderQueue) {
  const data = renderQueue
    .filter(entry => entry.dataMeta)
    .map(entry => pick(entry, ['route', 'path', 'dataMeta']))

  const routeMeta = groupBy(data, entry => entry.route)
  let num = 1

  for (const route in routeMeta) {
    const entries = routeMeta[route]
    const content = entries.reduce((acc, { path, dataMeta }) => {
      acc[path] = [dataMeta.group, dataMeta.hash]
      return acc
    }, {})

    if (entries.length > 1) {
      const output = path.join(app.config.dataDir, 'route-meta', `${num++}.json`)
      await fs.outputFile(output, JSON.stringify(content))
      routeMeta[route] = output
    } else {
      routeMeta[route] = content[entries[0].path]
    }
  }

  // re-generate routes with new page query meta
  await app.codegen.generate('routes.js', routeMeta)
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

async function renderHTML (renderQueue, config) {
  const timer = hirestime()
  const { outDir, htmlTemplate, clientManifestPath, serverBundlePath } = config

  const htmlQueue = renderQueue.map(entry => {
    const segments = entry.segments.map(segment => decodeURIComponent(segment))
    const fileName = entry.isIndex ? 'index.html' : `${segments.pop()}.html`

    return {
      path: entry.path,
      dataOutput: entry.dataOutput,
      htmlOutput: path.join(outDir, ...segments, fileName)
    }
  })

  const worker = createWorker('html-writer')

  await Promise.all(chunk(htmlQueue, 350).map(async pages => {
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

  info(`Render HTML (${htmlQueue.length} pages) - ${timer(hirestime.S)}s`)

  return htmlQueue
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
