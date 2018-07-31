import createApp from './app'

const { app, router } = createApp()

export default context => new Promise((resolve, reject) => {
  const { fullPath } = router.resolve(context.url).route

  if (fullPath !== url) {
    return reject({ url: fullPath })
  }

  router.push(context.url)
  context.meta = app.$meta()

  router.onReady(() => {
    resolve(app)
  }, reject)
})
