/* global GRIDSOME_MODE */

import router from '../router'
import { setResults } from './shared'
import prefetch from '../utils/prefetch'
import { unslashEnd } from '../utils/helpers'
import { NOT_FOUND_NAME, NOT_FOUND_PATH } from '../utils/constants'

export default (route, query, shouldPrefetch = false) => {
  if (GRIDSOME_MODE === 'serve') {
    const { page, ...params } = route.params
    const { location } = router.resolve({ ...route, params })
    const path = location.path || '/'

    return new Promise((resolve, reject) => {
      fetch(process.env.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: {
            page: page ? Number(page) : null,
            path: route.name === NOT_FOUND_NAME
              ? NOT_FOUND_PATH
              : path
          },
          query
        })
      })
        .then(res => res.json())
        .then(res => {
          if (res.errors) reject(res.errors[0])
          else if (!res.data) resolve(res)
          else setResults(route.path, res.data) && resolve(res)
        })
        .catch(err => {
          reject(err)
        })
    })
  } else if (GRIDSOME_MODE === 'static') {
    const publicPath = process.env.PUBLIC_PATH
    const isPrefetched = {}

    return new Promise((resolve, reject) => {
      const { name, meta: { isIndex, hash }} = route
      const usePath = name === NOT_FOUND_NAME ? NOT_FOUND_PATH : route.path
      const path = unslashEnd(usePath) || '/'

      const load = hash => {
        const segments = path.split('/').filter(s => !!s)
        const filename = isIndex === false ? segments.pop() : 'data'
        const jsonPath = publicPath + segments.concat(`${filename}.${hash}.json`).join('/') 

        if (shouldPrefetch) {
          if (!isPrefetched[jsonPath]) {
            isPrefetched[jsonPath] = prefetch(jsonPath)
          }

          return isPrefetched[jsonPath]
            .then(resolve)
            .catch(reject)
        }

        fetch(jsonPath, {
          headers: { 'Content-Type': 'application/json' }
        })
          .then(res => res.json())
          .then(res => {
            if (res.errors) reject(res.errors[0])
            else (setResults(route.path, res.data), resolve(res))
          })
          .catch(reject)
      }

      if (typeof hash === 'function') {
        hash().then(hashIndex => {
          if (hashIndex[path]) load(hashIndex[path])
          else resolve({ code: 404 })
        }).catch(reject)
      } else {
        load(hash)
      }
    })
  }
}
