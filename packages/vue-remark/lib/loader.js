const LRU = require('lru-cache')
const hash = require('hash-sum')
const loaderUtils = require('loader-utils')

const cache = new LRU({ max: 1000 })

module.exports = async function vueRemarkLoader (source, map) {
  const plugin = loaderUtils.getOptions(this)
  const cacheKey = hash(source + this.resourcePath)
  const cached = cache.get(cacheKey)
  const callback = this.async()

  let res = null

  if (cached) {
    callback(null, cached, map)
    return
  }

  try {
    res = await plugin.parse(source, { resourcePath: this.resourcePath })
  } catch (err) {
    callback(err, source, map)
    return
  }

  cache.set(cacheKey, res)
  callback(null, res, map)
}
