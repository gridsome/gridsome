const pMap = require('p-map')
const fs = require('fs-extra')
const hirestime = require('hirestime')

module.exports = async (queue, graphql, system) => {
  const timer = hirestime()
  const pages = queue.filter(page => !!page.dataOutput)

  await pMap(pages, async page => {
    const variables = { ...page.route.params, path: page.path }
    const results = await graphql(page.query, variables)

    await fs.outputFile(page.dataOutput, JSON.stringify(results))
  }, { concurrency: system.cpus.logical })

  console.info(`Run GraphQL (${pages.length} queries) - ${timer(hirestime.S)}s`)
}
