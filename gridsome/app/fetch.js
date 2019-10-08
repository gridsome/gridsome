import prefetch from './utils/prefetch'
import { unslashEnd } from './utils/helpers'

const isProd = process.env.NODE_ENV === 'production'
const dataUrl = process.env.DATA_URL
const isPrefetched = {}
const isLoaded = {}

const createError = (message, code) => {
  const error = new Error(message)
  error.code = code
  return error
}

const fetchJSON = jsonPath => {
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

          if (!results.hash && process.env.NODE_ENV === 'production') {
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

    req.send(null)
  })
}

export default (route, options = {}) => {
  const { shouldPrefetch = false, force = false } = options

  const hashMeta = isProd
    ? document
        .querySelector('meta[name="gridsome:hash"]')
        .getAttribute('content')
    : null

  return new Promise((resolve, reject) => {
    const usePath = route.path
    const jsonPath = route.meta.dataPath || unslashEnd(usePath) + '/index.json'
    let absPath = unslashEnd(dataUrl) + jsonPath

    if (route.meta.routeId) {
      absPath += `?routeId=${route.meta.routeId}`
    }

    if (force) {
      delete isPrefetched[jsonPath]
      delete isLoaded[jsonPath]
    }

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
        if (isProd && res.hash !== hashMeta) {
          reject(createError('Hash did not match.', 'INVALID_HASH'))
        } else {
          resolve(res)
        }
      })
      .catch(reject)
  })
}
