const pMap = require('p-map')
const fs = require('fs-extra')
const cpu = require('./utils/cpu')
const hirestime = require('hirestime')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (pages, graphql) => {
  const timer = hirestime()
  const concurrency = cpu.logical
  const queries = pages.filter(page => !!page.query)

  await pMap(queries, async page => {
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    fs.outputFileSync(`${page.output}/data.json`, JSON.stringify(results))
  }, { concurrency })

  info(`Run GraphQL (${queries.length} queries) - ${timer(hirestime.S)}s`)
}
