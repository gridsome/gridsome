const path = require('path')
const LRU = require('lru-cache')
const hash = require('hash-sum')

const cache = new LRU({ max: 1000 })

module.exports = async function (source, map) {
  const { config, graphql, store } = process.GRIDSOME
  const resourcePath = this.resourcePath

  // add dependency to now.js to re-run
  // this loader when store has changed
  if (process.env.NODE_ENV === 'development') {
    this.dependency(path.join(config.tmpDir, 'now.js'))
  }

  const callback = this.async()
  const cacheKey = hash({ source, resourcePath, lastUpdate: store.lastUpdate })
  const cached = cache.get(cacheKey)

  if (cached) {
    callback(null, cached, map)
    return
  }

  if (!source.trim()) {
    callback(null, '', map)
    return
  }

  const { errors, data } = await graphql(source)

  if (errors && errors.length) {
    callback(new Error(errors[0]), source, map)
    return
  }

  const res = `
    import Vue from 'vue'

    const { computed } = Vue.config.optionMergeStrategies
    const data = ${JSON.stringify(data)}

    export default ({ options }) => {
      if (options.__staticData) {
        options.__staticData.data = data
        return
      }

      options.__staticData = Vue.observable({ data })

      options.computed = computed({
        $static: () => options.__staticData.data
      }, options.computed)
    }
  `

  cache.set(cacheKey, res)

  callback(null, res, map)
}
