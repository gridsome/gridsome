const path = require('path')
const pMap = require('p-map')
const fs = require('fs-extra')
const cpu = require('../utils/cpu')
const hirestime = require('hirestime')

module.exports = async (queue, graphql, config) => {
  const timer = hirestime()
  const concurrency = cpu.logical
  const queries = queue.filter(page => !!page.query)

  await pMap(queries, async page => {
    const output = path.resolve(config.cacheDir, `data/${page.path}.json`)
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    await fs.outputFile(output, JSON.stringify(results))
  }, { concurrency })

  console.info(`Run GraphQL (${queries.length} queries) - ${timer(hirestime.S)}s`)
}
