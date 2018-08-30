const utils = require('loader-utils')

module.exports = async function (source, map) {
  const callback = this.async()

  const { queue } = process.GRIDSOME_SERVICE
  const options = utils.parseQuery(this.query || '?')
  const res = await queue.add(this.resourcePath, options)

  callback(null, `module.exports = ${JSON.stringify(res)}`)
}
