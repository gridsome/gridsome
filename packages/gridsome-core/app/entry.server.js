import createApp from './app'

const { app } = createApp()

export default context => new Promise((resolve, reject) => {
  const { fullPath } = context.route

  if (fullPath !== context.url) {
    return reject({ url: fullPath })
  }

  app.$router.push(context.url)
  context.meta = app.$meta()

  app.$router.onReady(() => {
    resolve(app)
  }, reject)
})
