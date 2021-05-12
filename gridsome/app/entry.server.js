import { createMemoryHistory } from 'vue-router'
import createApp from './app'
import { unslashEnd } from './utils/helpers'
import plugins from '~/.temp/plugins-server'

export default async (ssrContext) => {
  const { app, router, head } = createApp({
    plugins,
    routerHistory: createMemoryHistory(
      unslashEnd(process.env.PUBLIC_PATH)
    )
  })

  app.directive('g-link', {})
  app.directive('g-image', {})

  router.push(ssrContext.location)

  await router.isReady()

  return { app, router, head }
}
