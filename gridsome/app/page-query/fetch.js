/* global GRIDSOME_MODE */

import { setResults } from './shared'
import prefetch from '../utils/prefetch'
import { unslashEnd } from '../utils/helpers'
import { NOT_FOUND_NAME, NOT_FOUND_PATH } from '../utils/constants'

const dataUrl = process.env.DATA_URL
const isPrefetched = {}

export default (route, query, prefetchOnly = false) => {
  if (GRIDSOME_MODE === 'serve') {
    const { name, params: { page }} = route

    const path = page
      ? route.path.split('/').slice(0, -1).join('/')
      : route.path

    return new Promise((resolve, reject) => {
      fetch(process.env.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: {
            page: page ? Number(page) : null,
            path: name === NOT_FOUND_NAME ? NOT_FOUND_PATH : (path || '/')
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
  }

  return new Promise((resolve, reject) => {
    const load = ([ group, hash ]) => {
      const jsonPath = dataUrl + `${group}/${hash}.json` 

      if (prefetchOnly) {
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

    const { name, meta: { data }} = route
    const usePath = name === NOT_FOUND_NAME ? NOT_FOUND_PATH : route.path
    const path = unslashEnd(usePath) || '/'

    if (typeof data === 'function') {
      data().then(data => {
        if (data[path]) load(data[path])
        else resolve({ code: 404 })
      }).catch(reject)
    } else {
      load(data)
    }
  })
}
