/* global GRAPHQL_ENDPOINT, GRIDSOME_MODE, GRIDSOME_DATA_DIR */

import cache from './cache'
import config from '~/.temp/config.js'
import { unslash } from '../utils/helpers'

export default (route, query) => {
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
          cache.set(route.path, res.data)
          resolve(res)
        })
    })
  } else if (GRIDSOME_MODE === 'static') {
    return new Promise(resolve => {
      const re = new RegExp(`^${config.pathPrefix}`)
      const routePath = unslash(route.path.replace(re, '/'))
      const filename = !routePath ? '/index.json' : `/${routePath}.json`

      import(/* webpackChunkName: "data/" */ `${GRIDSOME_DATA_DIR}${filename}`).then(res => {
        cache.set(route.path, res.default.data)
        resolve(res)
      })
    })
  }
}
