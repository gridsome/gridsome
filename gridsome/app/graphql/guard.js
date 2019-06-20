import fetch from '../fetch'
import { getResults, setResults, formatError } from './shared'

export default (to, from, next) => {
  if (process.isServer) return next()

  if (process.isProduction && global.__INITIAL_STATE__) {
    setResults(to.path, global.__INITIAL_STATE__)
    global.__INITIAL_STATE__ = null
    return next()
  } else if (getResults(to.path)) {
    return next()
  }

  fetch(to)
    .then(res => {
      if (res.code === 404) {
        setResults(to.path, { data: null, context: {} })
        next({ name: '*', params: { 0: to.path }})
      } else {
        setResults(to.path, res)
        next()
      }
    })
    .catch(err => {
      if (err.code === 'MODULE_NOT_FOUND') {
        console.error(err) // eslint-disable-line
        next({ name: '*', params: { 0: to.path }})
      } if (err.code === 404 && to.path !== window.location.pathname) {
        // reload page if coming from another page and data doesn't exist
        window.location.assign(to.fullPath)
      } else {
        formatError(err, to)
        next(err)
      }
    })
}
