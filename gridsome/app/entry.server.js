import createApp from './app'

const { app, router } = createApp()
const meta = app.$meta()

export default context => new Promise((resolve, reject) => {
  router.push(context.url)
  context.meta = meta

  router.onReady(() => {
    resolve(app)
  }, reject)
})
