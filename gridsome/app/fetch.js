import prefetch from './utils/prefetch'
import { unslashEnd, stripPageParam } from './utils/helpers'
import { NOT_FOUND_PATH } from '~/.temp/constants'

const dataUrl = process.env.DATA_URL
const isPrefetched = {}
const isLoaded = {}

export default (route, options = {}) => {
  const { shouldPrefetch = false, force = false } = options

  if (!route.meta.data) {
    return Promise.resolve({ data: null, context: {}})
  }

  if (!process.isStatic) {
    const getJSON = function (route) {
      return new Promise((resolve, reject) => {
        fetch(process.env.GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: route.params.page ? Number(route.params.page) : null,
            path: route.name === '*' ? NOT_FOUND_PATH : stripPageParam(route)
          })
        })
          .then(res => res.json())
          .then(resolve)
          .catch(reject)
      })
    }

    return new Promise((resolve, reject) => {
      if (force || !isLoaded[route.fullPath]) {
        isLoaded[route.fullPath] = getJSON(route)
      }

      isLoaded[route.fullPath]
        .then(res => {
          if (res.errors) reject(res.errors[0])
          else if (res.code) resolve({ code: res.code })
          else resolve({
            data: res.data,
            context: res.extensions
              ? res.extensions.context
              : {}
          })
        })
        .catch(reject)
    })
  }

  return new Promise((resolve, reject) => {
    const loadJSON = ([ group, hash ]) => {
      const jsonPath = dataUrl + `${group}/${hash}.json`

      if (shouldPrefetch && !isLoaded[jsonPath]) {
        if (!isPrefetched[jsonPath]) {
          isPrefetched[jsonPath] = prefetch(jsonPath)
        }

        return isPrefetched[jsonPath]
          .then(() => resolve())
          .catch(() => resolve())
      }

      if (!isLoaded[jsonPath]) {
        isLoaded[jsonPath] = fetchJSON(jsonPath)
      }

      return isLoaded[jsonPath]
        .then(res => {
          if (res.errors) reject(res.errors[0])
          else resolve(res)
        })
        .catch(reject)
    }

    const { name, meta: { data }} = route
    const usePath = name === '*' ? NOT_FOUND_PATH : route.path
    const path = unslashEnd(usePath) || '/'

    if (typeof data === 'function') {
      data().then(data => {
        if (data[path]) loadJSON(data[path])
        else resolve({ code: 404 })
      }).catch(reject)
    } else {
      loadJSON(data)
    }
  })
}

function fetchJSON (jsonPath) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()

    req.open('GET', jsonPath, true)
    req.withCredentials = true

    req.onload = () => {
      switch (req.status) {
        case 200: {
          let results

          try {
            results = JSON.parse(req.responseText)
          } catch (err) {
            return reject(
              new Error(`Failed to parse JSON from ${jsonPath}. ${err.message}.`)
            )
          }

          return resolve(results)
        }
        case 404: {
          const error = new Error(req.statusText)
          error.code = req.status
          return reject(error)
        }
      }

      reject(new Error(`Failed to fetch ${jsonPath}.`))
    }

    req.send(null)
  })
}
