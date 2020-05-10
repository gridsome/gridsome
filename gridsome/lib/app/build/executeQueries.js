const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const invariant = require('invariant')
const hirestime = require('hirestime')
const { validate, specifiedRules } = require('graphql')
const sysinfo = require('../../utils/sysinfo')
const { error, info } = require('../../utils/log')

async function executeQueries (renderQueue, { context, pages, schema, graphql }, hash) {
  const timer = hirestime()
  const validated = new Set()
  const withErrors = new Set()

  // TODO: show all query errors
  const throwError = (err, component) => {
    if (!withErrors.has(component)) {
      const relPath = path.relative(context, component)
      error(`An error occurred while executing page-query for ${relPath}\n`)
      withErrors.add(component)
      throw new Error(err)
    }
  }

  const results = await pMap(renderQueue, async entry => {
    const route = pages.getRoute(entry.routeId)
    const page = pages.getPage(entry.pageId)

    invariant(route, `Could not find a route for: ${entry.path}`)
    invariant(page, `Could not find a page for: ${entry.path}`)

    const document = route.internal.query.document
    const context = pages._createPageContext(page, entry.queryVariables)
    const results = { data: null, context }

    if (document) {
      if (!validated.has(route.component)) {
        const errors = validate(schema.getSchema(), document, specifiedRules)

        if (errors && errors.length) {
          throwError(errors[0], route.component)
        }

        validated.add(route.component)
      }

      const { errors, data } = await graphql(document, entry.queryVariables)

      if (errors && errors.length) {
        throwError(errors[0], route.component)
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
