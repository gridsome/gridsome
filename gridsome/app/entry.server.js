import createApp, { runMain } from './app'

const NOT_FOUND_URL = '/404'
const NOT_FOUND_NAME = '404'

runMain()

export default context => new Promise((resolve, reject) => {
  const location = context.url === NOT_FOUND_URL
    ? { name: NOT_FOUND_NAME }
    : { path: context.url }

  const { app, router } = createApp()
  const { name } = router.resolve(location).route

  if (location.name !== NOT_FOUND_NAME && name === NOT_FOUND_NAME) {
    return reject(new Error(`Could not resolve ${context.url}`))
  }
  
  context.meta = app.$meta()
  router.push(location)

  router.onReady(() => {
    resolve(app)
  }, reject)
})
