const fs = require('fs-extra')
const cpu = require('./utils/cpu')
const hirestime = require('hirestime')
const createQueue = require('./createQueue')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (pages, graphql) => {
  const timer = hirestime()
  const queries = pages.filter(page => !!page.query)

  await createQueue(queries, {
    label: 'Running GraphQL queries',
    concurrent: cpu.logical,
    chunkSize: 50
  }, async (task, callback) => {
    for (let i = 0, l = task.data.length; i < l; i++) {
      const page = task.data[i]
      const variables = { ...page.route.params, path: page.path }
      const results = await graphql(page.query, variables)

      fs.outputFileSync(`${page.output}/data.json`, JSON.stringify(results))
    }

    callback()
  })

  info(`Run GraphQL (${queries.length} queries) - ${timer(hirestime.S)}s`)
}
