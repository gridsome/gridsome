import fetch from '../fetch'
import config from '#gridsome/config'
import { NOT_FOUND_NAME } from '#gridsome/constants'
import { getResults, setResults, formatError } from './shared'

export default (to, from, next) => {
  if (process.isServer) return next()

  const { __INITIAL_STATE__ = {} } = global
  const { data, context } = __INITIAL_STATE__

  // A custom route added by `router.addRoutes()`.
  if (to.meta && to.meta.__custom) {
    delete __INITIAL_STATE__.data
    delete __INITIAL_STATE__.context
    return next()
  }

  const cached = getResults(to.path)

  // Stop here if data for the next page is already fetched.
  if (cached) {
    return cached.context.__notFound && to.name !== NOT_FOUND_NAME
      ? next({ name: NOT_FOUND_NAME, params: { 0: to.path }})
      : next()
  }

  // Data and context already exists in the markup for the initial page.
  if (process.isProduction && data && context) {
    setResults(to.path, { data, context })

    delete __INITIAL_STATE__.data
    delete __INITIAL_STATE__.context

    return context.__notFound && to.name !== NOT_FOUND_NAME
      ? next({ name: NOT_FOUND_NAME, params: { 0: to.path }})
      : next()
  }

  fetch(to)
    .then(res => {
      if (res.code === 404) {
        next({ name: NOT_FOUND_NAME, params: { 0: to.path }})
      } else {
        setResults(to.path, res)
        next()
      }
    })
    .catch(err => {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 404) {
        next({ name: NOT_FOUND_NAME, params: { 0: to.path } })
      } else if (err.code === 'INVALID_HASH' && to.path !== window.location.pathname) {
        const fullPathWithPrefix = (config.pathPrefix ?? '') + to.fullPath
        window.location.assign(fullPathWithPrefix)
      } else {
        formatError(err, to)
        next(err)
      }
    })
}
