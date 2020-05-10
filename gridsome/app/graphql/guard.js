import fetch from '../fetch'
import config from '~/.temp/config'
import * as components from '~/.temp/routes'
import { NOT_FOUND_NAME } from '~/.temp/constants'
import { getResults, setResults, formatError } from './shared'

const resolved = new Set()

export default router => (to, from, _next) => {
  if (process.isServer) return _next()

  if (config.lazyLoadRoutes && !resolved.size) {
    router.options.routes.forEach(route => {
      resolved.add(route.path)
    })
  }

  const next = path => {
    if (to.matched.length) _next()
    else _next(path)
  }

  const addRoute = route => {
    if (
      config.lazyLoadRoutes &&
      !resolved.has(route.path) &&
      !to.meta.dynamic
    ) {
      console.log('addRoute', route)
      const { routes } = router.options

      router.addRoutes([route])
      resolved.add(route.path)

      // add route to the router options to make it visible in Vue devtools
      routes.push(route)

      // ensure wildcard routes are always at the end, this doesn't have any
      // impact on how routes are resolved but look better in devtools
      for (let i = 0, l = routes.length; i < l; i++) {
        if (routes[i].path === '*') {
          routes.push(routes.splice(i, 1)[0])
          l--
          i--
        }
      }
    }
  }

  const addNotFoundRoute = path => addRoute({
    component: components.notFound,
    meta: { dataPath: '/404/index.json' },
    path
  })

  if (to.meta && to.meta.__custom) {
    global.__INITIAL_STATE__ = null
    return next()
  }

  if (process.isProduction) {
    if (global.__INITIAL_STATE__) {
      const { route } = global.__INITIAL_STATE__

      setResults(to.path, global.__INITIAL_STATE__)

      if (route.name === NOT_FOUND_NAME) {
        addNotFoundRoute(to.path)
      } else {
        addRoute({
          ...route,
          component: components[route.componentId]
        })
      }

      global.__INITIAL_STATE__ = null

      return next(to.path)
    } else if (getResults(to.path)) {
      return next()
    }
  }

  fetch(to)
    .then(res => {
      if (res.code === 404) {
        setResults(to.path, { data: null, context: {} })
        addNotFoundRoute(to.path)
      } else {
        setResults(to.path, res)
        addRoute({
          ...res.route,
          component: components[res.route.componentId]
        })
      }

      next(to.path)
    })
    .catch(err => {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 404) {
        console.error(err)
        addNotFoundRoute(to.path)
        next(to.path)
      } else if (err.code === 'INVALID_HASH' && to.path !== window.location.pathname) {
        const fullPathWithPrefix = (config.pathPrefix ?? '') + to.fullPath
        window.location.assign(fullPathWithPrefix)
      } else {
        formatError(err, to)
        next(err)
      }
    })
}
