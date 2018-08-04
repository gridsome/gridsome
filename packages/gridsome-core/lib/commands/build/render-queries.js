const fs = require('fs-extra')
const cpu = require('./cpu')
const { chunk } = require('lodash')
const hirestime = require('hirestime')
const createQueue = require('./create-queue')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (service, data) => {
  const timer = hirestime()
  const chunks = chunk(data, 50)

  await createQueue(chunks, {
    label: 'Running GraphQL queries',
    concurrent: cpu.logical
  }, async (task, callback) => {
    for (let i = 0, l = task.data.length; i < l; i++) {
      const page = task.data[i]

      if (page.query) {
        const variables = { ...page.route.params, path: page.path }
        const results = await service.graphql(page.query, variables)

        fs.outputFileSync(`${page.output}/data.json`, JSON.stringify(results))
      }
    }

    callback()
  })

  info(`Run GraphQL queries - ${timer(hirestime.S)}s`)
}
