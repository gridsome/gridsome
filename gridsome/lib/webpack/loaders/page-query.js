const path = require('path')
const LRU = require('lru-cache')
const hash = require('hash-sum')
const validateQuery = require('../../graphql/validate')

const cache = new LRU({ max: 1000 })

module.exports = function (source, map) {
  const isDev = process.env.NODE_ENV === 'development'
  const isServing = process.env.GRIDSOME_MODE === 'serve'
  const { schema, config } = process.GRIDSOME
  const pageQueryPath = path.join(config.appPath, 'page-query')
  const pageQueryDevPath = path.join(pageQueryPath, 'dev')
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

  try {
    const errors = validateQuery(schema, source)

    if (errors && errors.length) {
      this.callback(new Error(errors[0]), source, map)
      return
    }
  } catch (err) {
    this.callback(err, source, map)
    return
  }

  this.dependency(path.join(config.appPath, 'page-query', 'index.js'))
  this.dependency(path.join(config.appPath, 'page-query', 'dev.js'))

  const res = `
    import initPageQuery from ${JSON.stringify(pageQueryPath)}
    ${isDev && `import initDevQuery from ${JSON.stringify(pageQueryDevPath)}`}

    const query = ${isServing ? JSON.stringify(source) : 'undefined'}

    export default Component => {
      initPageQuery(Component, query)
      ${isDev && 'initDevQuery(Component)'}
    }
  `

  cache.set(cacheKey, res)

  this.callback(null, res, map)
}
