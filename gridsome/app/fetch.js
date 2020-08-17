import prefetch from './utils/prefetch'
import { unslashEnd } from './utils/helpers'
import { NOT_FOUND_PATH } from '~/.temp/constants'

const dataUrl = process.env.DATA_URL
const isPrefetched = {}
const isLoaded = {}

export default (route, options = {}) => {
  const { shouldPrefetch = false, force = false } = options

  if (!process.isStatic) {
    const { dynamic = false } = route.meta
    let path = dynamic ? route.matched[0].path : route.path

    if (route.name === '*') {
      path = NOT_FOUND_PATH
    }

    return new Promise((resolve, reject) => {
      const onFail = err => {
        isLoaded[route.path] = null
        reject(err)
      }

      const onSuccess = res => {
        isLoaded[route.path] = null
        resolve(res)
      }

      if (force || !isLoaded[route.path]) {
        isLoaded[route.path] = fetch(process.env.GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, dynamic })
        })
          .then(res => res.json())
      }

      isLoaded[route.path]
        .then(res => {
          if (res.errors) onFail(res.errors[0])
          else if (res.code) onSuccess({ code: res.code })
          else onSuccess({
            data: res.data,
            context: res.extensions
              ? res.extensions.context
              : {}
          })
          isLoaded[route.path] = null
        })
        .catch(onFail)
    })
  }

  const hashMeta = document
    .querySelector('meta[name="gridsome:hash"]')
    .getAttribute('content')

  return new Promise((resolve, reject) => {
    const usePath = route.name === '*' ? NOT_FOUND_PATH : route.path
    const jsonPath = route.meta.dataPath || unslashEnd(usePath) + '/index.json'
    const absPath = unslashEnd(dataUrl) + jsonPath

    if (shouldPrefetch && !isLoaded[jsonPath]) {
      if (!isPrefetched[jsonPath]) {
        isPrefetched[jsonPath] = prefetch(absPath)
      }

      return isPrefetched[jsonPath]
        .then(() => resolve())
        .catch(() => resolve())
    }

    if (!isLoaded[jsonPath]) {
      isLoaded[jsonPath] = fetchJSON(absPath)
    }

    return isLoaded[jsonPath]
      .then(res => {
        if (res.hash !== hashMeta) {
          reject(
            createError(
              `Hash did not match: json=${res.hash}, document=${hashMeta}`,
              'INVALID_HASH'
            )
          )
        } else {
          resolve(res)
        }
      })
      .catch(err => {
        isLoaded[jsonPath] = null
        reject(err)
      })
  })
}

function createError (message, code) {
  const error = new Error(message)
  error.code = code
  return error
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

          if (!results.hash) {
            return reject(
              new Error(`JSON data in ${jsonPath} is missing a hash.`)
            )
          }

          return resolve(results)
        }
        case 404: {
          return reject(createError(req.statusText, req.status))
        }
      }

      reject(new Error(`Failed to fetch ${jsonPath}.`))
    }

    req.onerror = () => {
      reject(new Error(`Failed to fetch ${jsonPath}.`))
    }

    req.send(null)
  })
}
