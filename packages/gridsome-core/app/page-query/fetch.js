import cache from './cache'

export default (query, route) => {
  if (process.env.NODE_ENV === 'development') {
    const variables = { ...route.params, path: route.path }
    const cacheKey = global.btoa(route.fullPath).replace(/\=+/, '')
    
    route.meta.cacheKey = cacheKey

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

  // TODO: import json with hashcode from ssr
}
