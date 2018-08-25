const utils = require('loader-utils')

module.exports = function (source, map) {
  const { queue } = process.GRIDSOME_SERVICE
  const options = utils.parseQuery(this.query || '?')
  const url = queue.add(this.resourcePath, options)

  return `module.exports = ${JSON.stringify(url)}`
}
