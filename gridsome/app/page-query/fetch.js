/* global GRIDSOME_MODE, GRIDSOME_DATA_DIR */

import router from '../router'
import config from '~/.temp/config'
import { setResults } from './shared'
import { unslash } from '../utils/helpers'

const re = new RegExp(`^${config.pathPrefix}`)

export default (route, query) => {
  if (GRIDSOME_MODE === 'serve') {
    const { page, ...params } = route.params
    const { location } = router.resolve({ ...route, params })

    return new Promise((resolve, reject) => {
      fetch(process.env.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: {
            page: page ? Number(page) : null,
            path: location.path || route.path
          },
          query
        })
      })
        .then(res => res.json())
        .then(res => {
          if (res.errors) reject(res.errors[0])
          else setResults(route.path, res.data) && resolve(res)
        })
        .catch(err => {
          reject(err)
        })
    })
  } else if (GRIDSOME_MODE === 'static') {
    return new Promise((resolve, reject) => {
      const routePath = unslash(route.path.replace(re, '/'))
      const filename = !routePath ? '/index.json' : `/${routePath}.json`

      import(/* webpackChunkName: "data/" */ `${GRIDSOME_DATA_DIR}${filename}`)
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
