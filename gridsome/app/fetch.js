/* global GRIDSOME_MODE */

import prefetch from './utils/prefetch'
import { unslashEnd } from './utils/helpers'
import { NOT_FOUND_NAME, NOT_FOUND_PATH } from '~/.temp/constants'

const dataUrl = process.env.DATA_URL
const isPrefetched = {}

export default (route, shouldPrefetch = false) => {
  if (!route.meta.data) {
    return Promise.resolve({ data: null, context: {}})
  }

  if (GRIDSOME_MODE === 'serve') {
    // exclude page param from route path
    const path = route.params.page
      ? route.path.split('/').slice(0, -1).join('/') || '/'
      : route.path

    return new Promise((resolve, reject) => {
      fetch(process.env.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: route.params.page ? Number(route.params.page) : null,
          path: route.name === NOT_FOUND_NAME
            ? NOT_FOUND_PATH
            : path
        })
      })
        .then(res => res.json())
        .then(res => {
          if (res.errors) reject(res.errors[0])
          else resolve({ data: res.data, context: res.extensions.context })
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  return new Promise((resolve, reject) => {
    const load = ([ group, hash ]) => {
      const jsonPath = dataUrl + `${group}/${hash}.json` 

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
          else resolve(res)
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
