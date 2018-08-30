const LRU = require('lru-cache')

const cache = new LRU({ max: 1000 })

exports.cache = (cacheKey, fallback) => {
  let result = cache.get(cacheKey)

  if (!result) {
    cache.set(cacheKey, (result = fallback()))
  }

  return Promise.resolve(result)
}

exports.nodeCache = (node, key, fallback) => {
  const id = node.$loki
  const timestamp = node.internal.timestamp
  const cacheKey = `${id}-${timestamp}-${key}`

  let result = cache.get(cacheKey)

  if (!result) {
    cache.set(cacheKey, (result = fallback()))
  }

  return Promise.resolve(result)
}
