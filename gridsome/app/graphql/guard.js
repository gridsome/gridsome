import fetch from '../fetch'
import config from '~/.temp/config'
import { getResults, setResults, formatError } from './shared'

export default (to, from, next) => {
  if (process.isServer) return next()

  // A custom route added by `router.addRoutes()`.
  if (to.meta && to.meta.__custom) {
    global.__INITIAL_STATE__ = null
    return next()
  }

  const cached = getResults(to.path)

  // Stop here if data for the next page is already fetched.
  if (cached) {
    return cached.context.__notFound && to.name !== '*'
      ? next({ name: '*', params: { 0: to.path }})
      : next()
  }

  // The data already exists in the markup for the initial page.
  if (process.isProduction && global.__INITIAL_STATE__) {
    const { context } = global.__INITIAL_STATE__
    setResults(to.path, global.__INITIAL_STATE__)
    global.__INITIAL_STATE__ = null

    return context.__notFound && to.name !== '*'
      ? next({ name: '*', params: { 0: to.path }})
      : next()
  }

  fetch(to)
    .then(res => {
      if (res.code === 404) {
        next({ name: '*', params: { 0: to.path }})
      } else {
        setResults(to.path, res)
        next()
      }
    })
    .catch(err => {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 404) {
        console.error(err)
        next({ name: '*', params: { 0: to.path } })
      } else if (err.code === 'INVALID_HASH' && to.path !== window.location.pathname) {
        const fullPathWithPrefix = (config.pathPrefix ?? '') + to.fullPath
        window.location.assign(fullPathWithPrefix)
      } else {
        formatError(err, to)
        next(err)
      }
    })
}
