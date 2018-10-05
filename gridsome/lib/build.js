const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const hirestime = require('hirestime')
const { trim, chunk } = require('lodash')

const createApp = require('./app')
const createWorker = require('./app/createWorker')
const compileAssets = require('./webpack/compileAssets')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'production'
  process.env.GRIDSOME_MODE = 'static'

  const buildTime = hirestime()
  const app = await createApp(context, { args })
  const { config, system, graphql, plugins } = app
  const worker = createWorker(config, system.cpus.logical)

  await plugins.callHook('beforeBuild', { context, config })
  await fs.remove(config.outDir)

  const queue = await createRenderQueue(app)

  // 1. run all GraphQL queries and save results into json files
  await plugins.callHook('beforeRenderQueries', { context, config, queue })
  await renderPageQueries(queue, graphql, system)

  // 2. compile assets with webpack
  await compileAssets(context, config, plugins)

  // 3. render a static index.html file for each possible route
  await plugins.callHook('beforeRenderHTML', { context, config, queue })
  await renderHTML(queue, worker, config)

  // 4. process queued images
  await plugins.callHook('beforeProcessImages', { context, config, queue: app.queue })
  await processImages(app.queue, worker, config)

  // 5. clean up
  await plugins.callHook('afterBuild', { context, config, queue })
  await fs.remove(path.resolve(config.outDir, config.manifestsDir))

  worker.end()

  console.log()
  console.log(`  Done in ${buildTime(hirestime.S)}s`)
  console.log()
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
    const fullPath = isPager ? `${page.path}/${currentPage}` : page.path
    const { route } = router.resolve(fullPath)
    const { query } = page.pageQuery
    const routePath = trim(route.path, '/')
    const dataPath = !routePath ? 'index.json' : `${routePath}.json`
    const htmlOutput = path.resolve(config.targetDir, routePath, 'index.html')
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
    const htmlOutput = path.resolve(config.targetDir, routePath, 'index.html')
    const dataOutput = path.resolve(config.cacheDir, 'data', `${routePath}.json`)

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

async function renderPageQueries (queue, graphql, system) {
  const timer = hirestime()
  const pages = queue.filter(page => !!page.dataOutput)

  await pMap(pages, async page => {
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    await fs.outputFile(page.dataOutput, JSON.stringify(results))
  }, { concurrency: system.cpus.logical })

  console.info(`Run GraphQL (${pages.length} queries) - ${timer(hirestime.S)}s`)
}

async function renderHTML (queue, worker, config) {
  const timer = hirestime()
  const totalPages = queue.length
  const chunks = chunk(queue, 50)

  const { htmlTemplate, clientManifestPath, serverBundlePath } = config

  const onError = err => {
    // worker.end()
    throw err
  }

  await Promise.all(chunks.map(chunk => {
    // reduce amount of data sent to worker
    const pages = chunk.map(page => ({
      path: page.path,
      htmlOutput: page.htmlOutput,
      dataOutput: page.dataOutput
    }))

    return worker
      .renderHtml({
        pages,
        htmlTemplate,
        clientManifestPath,
        serverBundlePath
      }).catch(onError)
  })).catch(onError)

  console.info(`Render HTML (${totalPages} pages) - ${timer(hirestime.S)}s`)
}

async function processImages (queue, worker, { outDir, minProcessImageWidth }) {
  const timer = hirestime()
  const chunks = chunk(queue.queue, 100)
  const totalAssets = queue.queue.length

  await Promise.all(chunks.map(queue => {
    return worker
      .processImages({ queue, outDir, minWidth: minProcessImageWidth })
      .catch(err => {
        worker.end()
        throw err
      })
  }))

  console.info(`Process images (${totalAssets} images) - ${timer(hirestime.S)}s`)
}
