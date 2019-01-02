const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const { trim, chunk } = require('lodash')
const sysinfo = require('./utils/sysinfo')
const { log, info } = require('./utils/log')

const createApp = require('./app')
const { createWorker } = require('./workers')
const compileAssets = require('./webpack/compileAssets')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const app = await createApp(context, { args })
  const { config, graphql } = app

  await app.dispatch('beforeBuild', { context, config })
  await fs.ensureDir(config.cacheDir)
  await fs.remove(config.outDir)

  const queue = await createRenderQueue(app)

  // 1. run all GraphQL queries and save results into json files
  await app.dispatch('beforeRenderQueries', () => ({ context, config, queue }))
  await renderPageQueries(queue, graphql)

  // 2. compile assets with webpack
  await compileAssets(app)

  // 3. render a static index.html file for each possible route
  await app.dispatch('beforeRenderHTML', () => ({ context, config, queue }))
  await renderHTML(queue, config)

  // 4. process queued images
  await app.dispatch('beforeProcessAssets', () => ({ context, config, queue: app.queue }))
  await processFiles(app.queue.files, config)
  await processImages(app.queue.images, config)

  // 5. copy static files
  if (fs.existsSync(config.staticDir)) {
    await fs.copy(config.staticDir, config.outDir)
  }

  // 6. clean up
  await app.dispatch('afterBuild', () => ({ context, config, queue }))
  await fs.remove(path.resolve(config.cacheDir, 'data'))
  await fs.remove(config.manifestsDir)

  log()
  log(`  Done in ${buildTime(hirestime.S)}s`)
  log()

  return app
}

const {
  PAGED_ROUTE,
  STATIC_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('./utils/constants')

async function createRenderQueue ({ router, config, graphql }) {
  const createPage = (page, currentPage = 1) => {
    const isPager = currentPage > 1
    const pagePath = page.path.replace(/\/+$/, '')
    const fullPath = isPager ? `${pagePath}/${currentPage}` : page.path
    const { route } = router.resolve(fullPath)
    const { query } = page.pageQuery
    const routePath = trim(route.path, '/')
    const filePath = routePath.split('/').map(decodeURIComponent).join('/')
    const dataPath = !routePath ? 'index.json' : `${filePath}.json`
    const htmlOutput = path.resolve(config.outDir, filePath, 'index.html')
    const dataOutput = path.resolve(config.cacheDir, 'data', dataPath)

    // TODO: remove this before v1.0
    const output = path.dirname(htmlOutput)

    return {
      path: fullPath.replace(/\/+/g, '/'),
      dataOutput: query ? dataOutput : null,
      htmlOutput,
      output,
      query,
      route
    }
  }

  const createTemplate = (node, page) => {
    const { route } = router.resolve(node.path)
    const { query } = page.pageQuery
    const routePath = trim(route.path, '/')
    const filePath = routePath.split('/').map(decodeURIComponent).join('/')
    const htmlOutput = path.resolve(config.outDir, filePath, 'index.html')
    const dataOutput = path.resolve(config.cacheDir, 'data', `${filePath}.json`)

    // TODO: remove this before v1.0
    const output = path.dirname(htmlOutput)

    return {
      path: node.path,
      dataOutput: query ? dataOutput : null,
      htmlOutput,
      output,
      query,
      route
    }
  }

  const queue = []

  for (const route of router.options.routes) {
    const page = route.component()

    switch (page.type) {
      case STATIC_ROUTE:
      case STATIC_TEMPLATE_ROUTE:
        queue.push(createPage(page))

        break

      case DYNAMIC_TEMPLATE_ROUTE:
        page.collection.find().forEach(node => {
          queue.push(createTemplate(node, page))
        })

        break

      case PAGED_ROUTE:
        const { collection, perPage } = page.pageQuery.paginate
        const { data, errors } = await graphql(`
          query PageInfo ($perPage: Int) {
            ${collection} (perPage: $perPage) {
              pageInfo {
                totalPages
              }
            }
          }
        `, { perPage })

        if (errors && errors.length) {
          throw new Error(errors)
        }

        const { totalPages } = data[collection].pageInfo

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createPage(page, i))
        }

        break
    }
  }

  return queue
}

async function renderPageQueries (queue, graphql) {
  const timer = hirestime()
  const pages = queue.filter(page => !!page.dataOutput)

  await pMap(pages, async page => {
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    await fs.outputFile(page.dataOutput, JSON.stringify(results))
  }, { concurrency: sysinfo.cpus.logical })

  info(`Run GraphQL (${pages.length} queries) - ${timer(hirestime.S)}s`)
}

async function renderHTML (queue, config) {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 50)
  const worker = createWorker('html-writer')

  const { htmlTemplate, clientManifestPath, serverBundlePath } = config

  await Promise.all(chunks.map(async queue => {
    const pages = queue.map(page => ({
      path: page.path,
      htmlOutput: page.htmlOutput,
      dataOutput: page.dataOutput
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
