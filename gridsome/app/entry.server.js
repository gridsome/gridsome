import createApp, { runMain } from './app'
import * as components from '~/.temp/routes'

runMain()

let startRoute = null

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp()
  const { path, location } = context

  if (!startRoute) startRoute = router.history.current
  else router.history.current = startRoute

  if (location.path) {
    const { route } = context.state

    router.addRoutes([{
      ...route,
      component: components[route.componentId]
    }])
  }

  context.meta = app.$meta()

  router.onError(err => reject(err))
  router.push(location, () => {
    const { currentRoute: { matched }} = router

    if (!matched.length || matched[0].name === '*') {
      return reject(new Error(`Could not resolve ${path}.`))
    }

    router.history.errorCbs.pop()
    resolve(app)
  }, err => {
    if (err) reject(err)
    else {
      if (location.path === router.currentRoute.path) resolve(app)
      else reject(new Error(`Route transition was aborted while generating HTML.`))
    }
  })
})
