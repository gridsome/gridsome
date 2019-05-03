const LRU = require('lru-cache')
const hash = require('hash-sum')
const loaderUtils = require('loader-utils')

const cache = new LRU({ max: 1000 })

module.exports = async function mdVueLoader (source, map) {
  const callback = this.async()
  const cacheKey = hash(source)
  const cached = cache.get(cacheKey)

  if (cached) {
    callback(null, cached, map)
    return
  }

  const plugin = loaderUtils.getOptions(this)
  const sfc = await plugin.parse(source, this.resourcePath)

  cache.set(cacheKey, sfc)
  callback(null, sfc, map)
}
