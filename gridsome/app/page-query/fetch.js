/* global GRAPHQL_ENDPOINT, GRIDSOME_MODE, GRIDSOME_CACHE_DIR */

import cache from './cache'

export default (options, route) => {
  const cacheKey = route.fullPath

  route.meta.cacheKey = cacheKey

  if (GRIDSOME_MODE === 'serve') {
    const query = options.__pageQuery
    const variables = { ...route.params, path: route.path }

    return new Promise(resolve => {
      fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      })
        .then(res => res.json())
        .then(res => {
          cache.set(cacheKey, res.data)
          resolve(res)
        })
    })
  } else if (GRIDSOME_MODE === 'static') {
    return new Promise(resolve => {
      const path = route.path.replace(/[\/]+$/, '')
      const dataOutput = !path ? '/index.json' : `${path}.json`
      import(`${GRIDSOME_CACHE_DIR}/data${dataOutput}`).then(res => {
        cache.set(cacheKey, res.default.data)
        resolve(res)
      })
    })
  }
}
