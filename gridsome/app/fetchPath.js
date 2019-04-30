import fetch from './fetch'
import router from './router'

import {
  getResults,
  setResults,
  formatError
} from './graphql/shared'

export default function fetchPath (path) {
  if (process.isServer) {
    throw new Error(
      `Cannot fetch ${path} while rendering HTML. ` +
      `This method should ony be used in the mounted hook.`
    )
  }

  const { route } = router.resolve({ path })
  const cached = getResults(route.path)
  const notFoundErr = new Error(`Could not find ${path}`)

  return new Promise((resolve, reject) => {
    if (route.fullPath !== path) return reject(notFoundErr)
    if (route.name === '*') return reject(notFoundErr)
    if (cached) return resolve(cached)

    fetch(route)
      .then(res => {
        if (res.code === 404) reject(notFoundErr)
        else resolve(setResults(route.path, res))
      })
      .catch(err => {
        if (err.code === 'MODULE_NOT_FOUND' || err.code === 404) {
          reject(notFoundErr)
        } else {
          formatError(err, route)
          reject(err)
        }
      })
  })
}
