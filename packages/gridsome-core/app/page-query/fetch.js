import cache from './cache'
import { hashCode } from '../utils/hash'

export default (query, route) => {
  const variables = { ...route.params, path: route.path }
  route.meta.hash = hashCode(JSON.stringify(variables))

  let url = `${route.path}/data-${route.meta.hash}.json`
  let options = { headers: { 'Content-Type': 'application/json' } }

  if (process.env.NODE_ENV === 'development') {
    url = GRAPHQL_ENDPOINT
    options.method = 'POST'
    options.body = JSON.stringify({ query, variables })
  }

  return new Promise(resolve => {
    fetch(url, options)
      .then(res => res.json())
      .then(res => {
        cache.set(route.meta.hash, res.data)
        resolve(res)
      })
  })
}
