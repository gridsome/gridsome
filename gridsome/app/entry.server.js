import createApp, { runMain } from './app'

runMain()

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp()
  const location = context.url
  
  context.meta = app.$meta()

  router.push(location, () => {
    const { matched: [match] } = app.$route

    if (!match || (location !== '/404' && match.path === '*')) {
      return reject(new Error(`Could not resolve ${context.url}`))
    }

    resolve(app)
  })
})
