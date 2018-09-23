/* global GRAPHQL_ENDPOINT, GRIDSOME_HASH, GRIDSOME_MODE */

import cache from './cache'

export default (options, route) => {
  const query = options.__pageQuery
  const cacheKey = route.fullPath

  route.meta.cacheKey = cacheKey

  if (GRIDSOME_MODE === 'serve') {
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
  }

  return new Promise(resolve => {
    if (cache.has(cacheKey)) {
      return resolve(cache.get(cacheKey))
    }

    fetch(`${route.path.replace(/\/$/, '')}/data.json?${GRIDSOME_HASH}`, {
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(res => {
        cache.set(cacheKey, res.data)
        resolve(res)
      })
  })
}
