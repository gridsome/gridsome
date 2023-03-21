import createApp, { runMain } from './app'

runMain()

let startRoute = null

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp()
  const { path, location } = context

  if (!startRoute) startRoute = router.history.current
  else router.history.current = startRoute

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
