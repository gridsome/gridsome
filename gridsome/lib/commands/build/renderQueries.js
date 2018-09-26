const pMap = require('p-map')
const fs = require('fs-extra')
const hirestime = require('hirestime')

module.exports = async (queue, graphql, cacheDir, concurrency) => {
  const timer = hirestime()
  const queries = queue.filter(page => !!page.query)

  await pMap(queries, async page => {
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    await fs.outputFile(page.dataOutput, JSON.stringify(results))
  }, { concurrency })

  console.info(`Run GraphQL (${queries.length} queries) - ${timer(hirestime.S)}s`)
}
