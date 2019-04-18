/* global GRIDSOME_MODE, GRIDSOME_DATA_DIR */

import { setResults } from './shared'
import { unslash } from '../utils/helpers'
import { NOT_FOUND_NAME, NOT_FOUND_PATH } from '../utils/constants'

export default (route, query) => {
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
  } else if (GRIDSOME_MODE === 'static') {
    return new Promise((resolve, reject) => {
      const { name, meta: { isIndex }} = route
      const path = unslash(name === NOT_FOUND_NAME ? NOT_FOUND_PATH : route.path)
      const jsonPath = unslash(isIndex === false ? `${path}.json` : `${path}/index.json`)

      import(/* webpackChunkName: "data/" */ `${GRIDSOME_DATA_DIR}/${jsonPath}`)
        .then(res => {
          if (res.errors) reject(res.errors[0])
          else (setResults(route.path, res.data), resolve(res))
        })
        .catch(err => {
          reject(err)
        })
    })
  }
}
