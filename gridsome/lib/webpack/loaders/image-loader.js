const utils = require('loader-utils')

module.exports = async function (source, map) {
  const callback = this.async()

  const { queue } = process.GRIDSOME
  const options = utils.parseQuery(this.query || '?')
  const res = await queue.add(this.resourcePath, options)

  this.dependency(this.resourcePath)

  callback(null, `module.exports = ${JSON.stringify(res)}`)
}
