const LRU = require('lru-cache')
const hash = require('hash-sum')
const validate = require('../validate')

const cache = new LRU({ max: 1000 })

module.exports = function (source, map) {
  const { schema } = process.GRIDSOME
  const resourcePath = this.resourcePath

  const cacheKey = hash({ source, resourcePath })
  const cached = cache.get(cacheKey)

  if (cached) {
    this.callback(null, cached, map)
    return
  }

  if (!source.trim()) {
    this.callback(null, '', map)
    return
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      const errors = validate(schema.getSchema(), source)

      if (errors && errors.length) {
        this.callback(new Error(errors[0]), source, map)
        return
      }
    } catch (err) {
      this.callback(err, source, map)
      return
    }
  }

  cache.set(cacheKey, true)

  this.callback(null, '', map)
}
