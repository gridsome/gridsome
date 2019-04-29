import createApp, { runMain } from './app'

runMain()

export default context => new Promise((resolve, reject) => {
  const { url } = context
  const { app, router } = createApp()
  const { fullPath, name } = router.resolve(url).route

  if (fullPath !== url || name === '*') {
    return reject(new Error(`Could not resolve ${url}`))
  }
  
  context.meta = app.$meta()

  router.push(url)
  router.onReady(() => resolve(app))
})
