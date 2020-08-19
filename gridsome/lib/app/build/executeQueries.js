const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const invariant = require('invariant')
const hirestime = require('hirestime')
const { validate, specifiedRules } = require('graphql')
const { createQueryVariables } = require('../../graphql/utils')
const sysinfo = require('../../utils/sysinfo')
const { error, info } = require('../../utils/log')

async function executeQueries (renderQueue, { context, pages, schema, graphql }, hash) {
  const validated = new Set()
  const withErrors = new Set()
  const timer = hirestime()

  // TODO: show all query errors
  const throwError = (err, component) => {
    if (!withErrors.has(component)) {
      const relPath = path.relative(context, component)
      error(`An error occurred while executing page-query for ${relPath}\n`)
      withErrors.add(component)
      throw new Error(err)
    }
  }

  await pMap(renderQueue, async entry => {
    const route = pages.getRoute(entry.routeId)
    const page = pages.getPage(entry.pageId)

    invariant(route, `Could not find a route for: ${entry.path}`)
    invariant(page, `Could not find a page for: ${entry.path}`)

    const document = route.internal.query.document
    const queryVariables = document
      ? createQueryVariables(
        entry.currentPath,
        page.internal.query.variables,
        entry.currentPage
      )
      : {}

    const context = pages._createPageContext(page, queryVariables)
    const result = { hash, data: null, context }

    if (document) {
      if (!validated.has(route.component)) {
        const errors = validate(schema.getSchema(), document, specifiedRules)

        if (errors && errors.length) {
          throwError(errors[0], route.component)
        }

        validated.add(route.component)
      }

      const { errors, data } = await graphql(document, queryVariables)

      if (errors && errors.length) {
        throwError(errors[0], route.component)
      }

      result.data = data
    }

    const content = JSON.stringify(result)

    await fs.outputFile(entry.dataOutput, content)
  }, { concurrency: sysinfo.cpus.physical })

  info(`Execute GraphQL (${renderQueue.length} queries) - ${timer(hirestime.S)}s`)
}

module.exports = executeQueries
