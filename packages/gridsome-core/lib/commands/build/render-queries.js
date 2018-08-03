const fs = require('fs-extra')
const hirestime = require('hirestime')
const { info } = require('@vue/cli-shared-utils')

module.exports = async (service, data) => {
  const timer = hirestime()
  const total = data.length

  for (let i = 0; i < total; i++) {
    const progress = Math.ceil((i / total) * 100)
    process.stdout.write(`Running page queries - ${progress}%`)
    
    const page = data[i]

    if (page.query) {
      const variables = { ...page.route.params, path: page.path }
      const results = await service.graphql(page.query, variables)
      
      fs.outputFileSync(`${page.output}/data.json`, JSON.stringify(results))
    }

    process.stdout.clearLine()
    process.stdout.cursorTo(0)
  }

  info(`Run page queries - ${timer(hirestime.S)}s`)
}
