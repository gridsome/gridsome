import createApp from './app'

const { app } = createApp()

export default context => new Promise((resolve, reject) => {
  app.$router.push(context.url)
  context.head = app.$meta()

  app.$router.onReady(() => {
    resolve(app)
  }, reject)
})
