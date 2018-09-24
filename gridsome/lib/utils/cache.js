const LRU = require('lru-cache')
const crypto = require('crypto')

const cache = new LRU({ max: 1000 })

exports.cache = (cacheKey, fallback) => {
  let result = cache.get(cacheKey)

  if (!result) {
    cache.set(cacheKey, (result = fallback()))
  }

  return Promise.resolve(result)
}

exports.nodeCache = (node, key, fallback) => {
  const { $loki, fields, internal } = node
  const string = JSON.stringify({ $loki, fields, internal })
  const hash = crypto.createHash('md5').update(string).digest('hex')
  const cacheKey = `${$loki}-${hash}-${key}`

  let result = cache.get(cacheKey)

  if (!result) {
    cache.set(cacheKey, (result = fallback()))
  }

  return Promise.resolve(result)
}
