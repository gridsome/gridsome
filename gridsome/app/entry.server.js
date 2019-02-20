import createApp, { runMain } from './app'

runMain()

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp()
  let { url } = context

  if (url === '/404') {
    url = { name: '404' }
  }
  
  context.meta = app.$meta()
  router.push(url)

  router.onReady(() => {
    resolve(app)
  }, reject)
})
