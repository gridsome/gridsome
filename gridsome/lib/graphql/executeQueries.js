const path = require('path')
const pMap = require('p-map')
const hashSum = require('hash-sum')
const hirestime = require('hirestime')
const sysinfo = require('../utils/sysinfo')
const { error, info } = require('../utils/log')
const { isEmpty } = require('lodash')

async function executeQueries (renderQueue, app) {
  const timer = hirestime()
  const groupSize = 500

  let count = 0
  let group = 0

  const res = await pMap(renderQueue, async entry => {
    if (!entry.query && isEmpty(entry.context)) {
      return entry
    }

    if (count % (groupSize - 1) === 0) group++
    count++

    const results = entry.query
      ? await app.graphql(entry.query.document, entry.query.variables)
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

module.exports = executeQueries
