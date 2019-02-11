const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const { safeKey } = require('./utils')
const { trimEnd, trimStart, chunk } = require('lodash')
const sysinfo = require('./utils/sysinfo')
const { log, info } = require('./utils/log')

const createApp = require('./app')
const { createWorker } = require('./workers')
const compileAssets = require('./webpack/compileAssets')
const queryVariables = require('./graphql/utils/queryVariables')
const { createFilterQuery } = require('./graphql/schema/createFilterTypes')

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
  PAGED_TEMPLATE,
  NOT_FOUND_ROUTE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('./utils/constants')

module.exports.createRenderQueue = createRenderQueue

async function createRenderQueue ({ router, config, store, schema }) {
  const rootFields = schema.getQueryType().getFields()

  const createEntry = (node, page, currentPage = 1) => {
    let fullPath = trimEnd(node.path, '/') || '/'

    if (page.type === NOT_FOUND_ROUTE) fullPath = '/404'
    if (currentPage > 1) fullPath = `/${trimStart(fullPath, '/')}/${currentPage}`

    const filePath = fullPath.split('/').map(decodeURIComponent).join('/')
    const dataPath = fullPath === '/' ? 'index.json' : `${filePath}.json`
    const { route: { params }} = router.resolve(fullPath)
    const { query } = page.pageQuery

    const htmlOutput = path.join(config.outDir, filePath, 'index.html')
    const dataOutput = query ? path.join(config.cacheDir, 'data', dataPath) : null

    const variables = queryVariables(node, page.pageQuery.variables)

    if (params.page) {
      variables.page = Number(params.page)
    }

    variables.path = node.path

    return {
      dataOutput,
      htmlOutput,
      path: fullPath,
      pageQuery: {
        query,
        variables
      }
    }
  }

  const createPage = (page, currentPage = 1) => {
    const entry = createEntry(page, page, currentPage)

    if (page.directoryIndex === false && page.path !== '/') {
      entry.htmlOutput = `${path.dirname(entry.htmlOutput)}.html`
    }

    return entry
  }

  const queue = []

  for (const route of router.options.routes) {
    const page = route.component()

    switch (page.type) {
      case STATIC_ROUTE:
      case NOT_FOUND_ROUTE:
      case STATIC_TEMPLATE_ROUTE: {
        queue.push(createPage(page))

        break
      }

      case DYNAMIC_TEMPLATE_ROUTE: {
        page.collection.find().forEach(node => {
          queue.push(createEntry(node, page))
        })

        break
      }

      case PAGED_TEMPLATE: {
        const { fieldName, perPage, filter } = page.pageQuery.paginate
        const { belongsTo } = rootFields[fieldName].type.getFields()
        const filterArg = filter ? belongsTo.args.find(arg => arg.name === 'filter') : null
        const query = filterArg ? createFilterQuery(filter || {}, filterArg.type.getFields()) : {}

        page.collection.find().forEach(node => {
          const key = `belongsTo.${node.typeName}.${safeKey(node.id)}`
          const totalNodes = store.index.count({ ...query, [key]: { $eq: true }})
          const totalPages = Math.ceil(totalNodes / perPage)

          for (let i = 1; i <= totalPages; i++) {
            queue.push(createEntry(node, page, i))
          }
        })

        break
      }

      case PAGED_ROUTE: {
        const { typeName, fieldName, perPage, filter } = page.pageQuery.paginate
        const filterArg = filter ? rootFields[fieldName].args.find(arg => arg.name === 'filter') : null
        const query = filterArg ? createFilterQuery(filter || {}, filterArg.type.getFields()) : undefined
        const { collection } = store.getContentType(typeName)
        const totalNodes = collection.count(query)
        const totalPages = Math.ceil(totalNodes / perPage)

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createPage(page, i))
        }

        break
      }
    }
  }

  return queue
}

async function renderPageQueries (queue, graphql) {
  const timer = hirestime()
  const pages = queue.filter(page => !!page.dataOutput)

  await pMap(pages, async page => {
    const { dataOutput, pageQuery: { query, variables }} = page
    const results = await graphql(query, variables)

    if (results.errors) {
      throw new Error(results.errors)
    }

    await fs.outputFile(dataOutput, JSON.stringify(results))
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
