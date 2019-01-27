const path = require('path')
const LRU = require('lru-cache')
const hash = require('hash-sum')
const validateQuery = require('../../graphql/utils/validateQuery')

const cache = new LRU({ max: 1000 })

module.exports = async function (source, map) {
  const { config, schema, graphql } = process.GRIDSOME
  const staticQueryPath = path.join(config.appPath, 'static-query')
  const resourcePath = this.resourcePath

  this.dependency(path.join(config.appPath, 'static-query', 'index.js'))

  // add dependency to now.js to re-run
  // this loader when store has changed
  if (process.env.NODE_ENV === 'development') {
    this.dependency(path.join(config.tmpDir, 'now.js'))
  }

  const callback = this.async()
  const cacheKey = hash({ source, resourcePath })
  const cached = cache.get(cacheKey)

  if (cached) {
    callback(null, cached, map)
    return
  }

  try {
    const errors = validateQuery(schema, source)

    if (errors && errors.length) {
      return callback(errors, source, map)
    }
  } catch (err) {
    return callback(err, source, map)
  }

  const { data } = await graphql(source)

  const res = `
    import initStaticQuery from ${JSON.stringify(staticQueryPath)}

    const data = ${JSON.stringify(data)}

    export default Component => {
      initStaticQuery(Component, data)
    }
  `

  cache.set(cacheKey, res)

  callback(null, res, map)
}
