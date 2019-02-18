import createApp, { runMain } from './app'

runMain()

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp()
  
  context.meta = app.$meta()
  router.push(context.url)

  router.onReady(() => {
    resolve(app)
  }, reject)
})
