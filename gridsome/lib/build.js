const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const { createPath } = require('./utils')
const sysinfo = require('./utils/sysinfo')
const { log, error, info } = require('./utils/log')

const createApp = require('./app')
const { execute } = require('graphql')
const { createWorker } = require('./workers')
const { createBelongsToKey } = require('./graphql/nodes/utils')
const { createFilterQuery } = require('./graphql/createFilterTypes')
const { processPageQuery, contextValues } = require('./graphql/page-query')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const app = await createApp(context, { args })
  const { config } = app

  await app.dispatch('beforeBuild', { context, config })
  await fs.ensureDir(config.dataDir)
  await fs.remove(config.outDir)

  const queue = await createRenderQueue(app)

  // 1. run all GraphQL queries and save results into json files
  await app.dispatch('beforeRenderQueries', () => ({ context, config, queue }))
  await renderPageQueries(queue, app)

  // 2. compile assets with webpack
  await runWebpack(app)

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
  await fs.remove(config.manifestsDir)
  await fs.remove(config.dataDir)

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
  PAGED_STATIC_TEMPLATE,
  STATIC_TEMPLATE_ROUTE,
  DYNAMIC_TEMPLATE_ROUTE
} = require('./utils/constants')

module.exports.createRenderQueue = createRenderQueue

async function createRenderQueue ({ routes, config, store, schema }) {
  const rootFields = schema.getQueryType().getFields()

  const createEntry = (node, page, query, variables = { page: 1 }) => {
    const path = createPath(node.path, variables.page, page.isIndex)

    return {
      path: path.toUrlPath(),
      htmlOutput: path.toFilePath(config.outDir, 'html'),
      dataOutput: query ? path.toFilePath(config.dataDir, 'json') : null,
      variables: { ...variables, path: node.path },
      component: page.component,
      query
    }
  }

  const queue = []
  const queries = {}

  for (const page of routes) {
    const key = page.component
    let pageQuery = null

    if (!queries[key]) {
      queries[key] = processPageQuery(page.pageQuery)
    }

    pageQuery = queries[key]

    switch (page.type) {
      case STATIC_ROUTE:
      case NOT_FOUND_ROUTE: {
        queue.push(createEntry(page, page, pageQuery.query))

        break
      }

      case STATIC_TEMPLATE_ROUTE: {
        const node = store.getNodeByPath(page.path)
        const variables = contextValues(node, pageQuery.variables)
        queue.push(createEntry(node, page, pageQuery.query, variables))

        break
      }

      case DYNAMIC_TEMPLATE_ROUTE: {
        const { collection } = store.getContentType(page.typeName)
        const nodes = collection.find()
        const length = nodes.length

        for (let i = 0; i < length; i++) {
          const variables = contextValues(nodes[i], pageQuery.variables)
          queue.push(createEntry(nodes[i], page, pageQuery.query, variables))
        }

        break
      }

      case PAGED_STATIC_TEMPLATE: {
        const { fieldName } = pageQuery.paginate
        const { belongsTo } = rootFields[fieldName].type.getFields()
        const filter = belongsTo.args.find(arg => arg.name === 'filter')
        const fields = filter.type.getFields()
        const node = store.getNodeByPath(page.path)
        const variables = contextValues(node, pageQuery.variables)
        const filters = pageQuery.getFilters(variables)
        const perPage = pageQuery.getPerPage(variables)
        const query = createFilterQuery(filters, fields)
        const key = createBelongsToKey(node)
        const totalNodes = store.index.count({ ...query, [key]: { $eq: true }})
        const totalPages = Math.ceil(totalNodes / perPage) || 1

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createEntry(node, page, pageQuery.query, { ...variables, page: i }))
        }

        break
      }

      case PAGED_TEMPLATE: {
        const { fieldName } = pageQuery.paginate
        const { belongsTo } = rootFields[fieldName].type.getFields()
        const filter = belongsTo.args.find(arg => arg.name === 'filter')
        const fields = filter.type.getFields()
        const { collection } = store.getContentType(page.typeName)
        const nodes = collection.find()
        const length = nodes.length

        for (let i = 0; i < length; i++) {
          const node = nodes[i]
          const variables = contextValues(node, pageQuery.variables)
          const filters = pageQuery.getFilters(variables)
          const perPage = pageQuery.getPerPage(variables)
          const query = createFilterQuery(filters, fields)

          const key = createBelongsToKey(node)
          const totalNodes = store.index.count({ ...query, [key]: { $eq: true }})
          const totalPages = Math.ceil(totalNodes / perPage) || 1

          for (let i = 1; i <= totalPages; i++) {
            queue.push(createEntry(node, page, pageQuery.query, { ...variables, page: i }))
          }
        }

        break
      }

      case PAGED_ROUTE: {
        const { typeName, fieldName } = pageQuery.paginate
        const { args } = rootFields[fieldName]
        const { collection } = store.getContentType(typeName)
        const filter = args.find(arg => arg.name === 'filter')
        const fields = filter.type.getFields()
        const filters = pageQuery.getFilters()
        const perPage = pageQuery.getPerPage()
        const query = createFilterQuery(filters, fields)
        const totalNodes = collection.find(query).length
        const totalPages = Math.ceil(totalNodes / perPage) || 1

        for (let i = 1; i <= totalPages; i++) {
          queue.push(createEntry(page, page, pageQuery.query, { page: i }))
        }

        break
      }
    }
  }

  return queue
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

async function renderPageQueries (queue, app) {
  const timer = hirestime()
  const context = app.createSchemaContext()
  const pages = queue.filter(page => !!page.dataOutput)

  await pMap(pages, async ({ dataOutput, query, variables, component }) => {
    const results = await execute(app.schema, query, undefined, context, variables)

    if (results.errors) {
      const relPath = path.relative(app.context, component)
      error(`An error occurred while executing page-query for ${relPath}\n`)
      throw new Error(results.errors[0])
    }

    await fs.outputFile(dataOutput, JSON.stringify(results))
  }, { concurrency: sysinfo.cpus.physical })

  info(`Run GraphQL (${pages.length} queries) - ${timer(hirestime.S)}s`)
}

async function renderHTML (queue, config) {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 350)
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

// borrowed from vuepress/core/lib/build.js
// webpack fails silently in some cases, appends styles.js to app.js to fix it
// https://github.com/webpack-contrib/mini-css-extract-plugin/issues/85
async function removeStylesJsChunk (stats, outDir) {
  const { children: [child] } = stats
  const styleChunk = child.assets.find(a => /styles(\.\w{8})?\.js$/.test(a.name))
  const appChunk = child.assets.find(a => /app(\.\w{8})?\.js$/.test(a.name))

  if (!styleChunk) return

  const styleChunkPath = path.join(outDir, styleChunk.name)
  const styleChunkContent = await fs.readFile(styleChunkPath, 'utf-8')
  const appChunkPath = path.join(outDir, appChunk.name)
  const appChunkContent = await fs.readFile(appChunkPath, 'utf-8')

  await fs.remove(styleChunkPath)
  await fs.writeFile(appChunkPath, styleChunkContent + appChunkContent)
}
