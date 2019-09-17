const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const invariant = require('invariant')
const hirestime = require('hirestime')
const sysinfo = require('../../utils/sysinfo')
const { error, info } = require('../../utils/log')

async function executeQueries (renderQueue, { context, pages, graphql }, hash) {
  const timer = hirestime()

  const results = await pMap(renderQueue, async entry => {
    const route = pages.getRoute(entry.routeId)
    const page =  pages.getPage(entry.pageId)

    invariant(route, `Could not find a route for: ${entry.path}`)
    invariant(page, `Could not find a page for: ${entry.path}`)

    const results = { data: null, context: page.context }
    const document = route.internal.query.document

    if (document) {
      const { errors, data } = await graphql(document, entry.queryVariables)

      if (errors) {
        const relPath = path.relative(context, route.component)
        error(`An error occurred while executing page-query for ${relPath}\n`)
        throw new Error(errors[0])
      }

      results.data = data
    }

    return { dataOutput: entry.dataOutput, data: results }
  }, { concurrency: sysinfo.cpus.physical })

  info(`Execute GraphQL (${renderQueue.length} queries) - ${timer(hirestime.S)}s`)

  const timer2 = hirestime()

  await Promise.all(results.map(result => {
    const content = JSON.stringify({ hash, ...result.data })
    return fs.outputFile(result.dataOutput, content)
  }))

  info(`Write out page data (${results.length} files) - ${timer2(hirestime.S)}s`)
}

module.exports = executeQueries
