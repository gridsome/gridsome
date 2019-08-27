import createApp, { runMain } from './app'

runMain()

export default context => new Promise((resolve, reject) => {
  const { url } = context
  const { app, router } = createApp()
  const { fullPath, name } = router.resolve(url).route

  if (fullPath !== url || name === '*') {
    return reject(new Error(`Could not resolve ${url}.`))
  }

  context.meta = app.$meta()

  router.onError(err => reject(err))
  router.push(url, () => {
    router.history.errorCbs.pop()
    resolve(app)
  }, err => {
    if (err) reject(err)
    else {
      if (url === router.currentRoute.path) resolve(app)
      else reject(new Error(`Route transition was aborted while generating HTML.`))
    }
  })
})
