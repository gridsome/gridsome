import createApp, { runMain } from './app'
import { NOT_FOUND_NAME, NOT_FOUND_PATH } from './utils/constants'

runMain()

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp()
  const location = context.url
  
  context.meta = app.$meta()

  router.push(location, () => {
    const { matched: [match] } = app.$route

    if (!match || (location !== NOT_FOUND_PATH && match.name === NOT_FOUND_NAME)) {
      return reject(new Error(`Could not resolve ${context.url}`))
    }

    resolve(app)
  })
})
