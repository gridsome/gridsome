const path = require('path')
const pMap = require('p-map')
const hashSum = require('hash-sum')
const invariant = require('invariant')
const hirestime = require('hirestime')
const sysinfo = require('../../utils/sysinfo')
const { error, info } = require('../../utils/log')

async function executeQueries (renderQueue, { context, config, pages, graphql }) {
  const assetsDir = config.assetsDir
  const timer = hirestime()
  const groupSize = 500

  let count = 0
  let group = 0

  const res = await pMap(renderQueue, async entry => {
    const route = pages.getRoute(entry.routeId)
    const page =  pages.getPage(entry.pageId)

    invariant(route, `Could not find a route for: ${entry.path}`)
    invariant(page, `Could not find a page for: ${entry.path}`)

    const pageContext = page.context || {}
    const document = route.internal.query.document

    if (document === null && Object.keys(pageContext).length < 1) {
      return entry
    }

    if (count % (groupSize - 1) === 0) group++
    count++

    const results = document
      ? await graphql(document, entry.queryVariables)
      : {}

    if (results.errors) {
      const relPath = path.relative(context, route.component)
      error(`An error occurred while executing page-query for ${relPath}\n`)
      throw new Error(results.errors[0])
    }

    const data = { data: results.data || null, context: pageContext }
    const hash = hashSum(data)
    const dataInfo = { group, hash }
    const dataOutput = path.join(assetsDir, 'data', `${group}/${hash}.json`)

    return Object.assign({}, entry, { dataOutput, data, dataInfo })
  }, { concurrency: sysinfo.cpus.physical })

  info(`Execute GraphQL (${count} queries) - ${timer(hirestime.S)}s`)

  return res
}

module.exports = executeQueries
