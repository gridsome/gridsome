const pMap = require('p-map')
const fs = require('fs-extra')
const cpu = require('./utils/cpu')
const hirestime = require('hirestime')

module.exports = async (queue, graphql, logger = global.console) => {
  const timer = hirestime()
  const concurrency = cpu.logical
  const queries = queue.filter(page => !!page.query)

  await pMap(queries, async page => {
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    fs.outputFileSync(`${page.output}/data.json`, JSON.stringify(results))
  }, { concurrency })

  logger.info(`Run GraphQL (${queries.length} queries) - ${timer(hirestime.S)}s`)
}
