import fetch from '../fetch'
import config from '~/.temp/config'
import { setResults, formatError } from './shared'

export default (to, from, next) => {
  if (process.isServer) return next()

  // A custom route added by `router.addRoutes()`.
  if (to.meta && to.meta.__custom) {
    global.__INITIAL_STATE__ = null
    return next()
  }

  const notFound = { name: '*', params: { pathMatch: to.path }}

  // The data already exists in the markup for the initial page.
  if (process.isProduction && global.__INITIAL_STATE__) {
    const { context } = global.__INITIAL_STATE__
    setResults(to, global.__INITIAL_STATE__)
    global.__INITIAL_STATE__ = null

    return context.__notFound && to.name !== '*'
      ? next(notFound)
      : next()
  }

  fetch(to)
    .then(res => {
      if (res.code === 404) {
        next(notFound)
      } else {
        setResults(to, res)
        next()
      }
    })
    .catch(err => {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 404) {
        console.error(err)
        next(notFound)
      } else if (err.code === 'INVALID_HASH' && to.path !== window.location.pathname) {
        const fullPathWithPrefix = (config.pathPrefix ?? '') + to.fullPath
        window.location.assign(fullPathWithPrefix)
      } else {
        formatError(err, to)
        next(err)
      }
    })
}
