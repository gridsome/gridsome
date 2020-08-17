import fetch from './fetch'
import { setResults, formatError } from './graphql/shared'

export function createPathFetcher(router) {
  return function fetchPath(path) {
    if (process.isServer) {
      throw new Error(
        `Cannot fetch ${path} while rendering HTML. ` +
        `This method should ony be used in the onMounted hook.`
      )
    }

    const route = router.resolve({ path })
    const notFoundErr = new Error(`Could not find ${path}`)

    return new Promise((resolve, reject) => {
      if (route.name === '*') return reject(notFoundErr)

      fetch(route)
        .then(res => {
          if (res.code === 404) reject(notFoundErr)
          else resolve(setResults(route, res))
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
}
