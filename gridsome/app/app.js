import { createApp as createClientApp, createSSRApp } from 'vue'
import { createMetaManager, defaultConfig, useMeta } from 'vue-meta'
import { createRouter } from 'vue-router'

import * as main from '~/main'
import App from '~/App.vue'

import { createPathFetcher } from './fetchPath'
import { url } from './utils/helpers'
import graphqlGuard from './graphql/guard'
import graphqlMixin from './graphql/mixin'
import routes from '~/.temp/routes.js'

import Link from './components/Link'
import Image from './components/Image'
import ClientOnly from './components/ClientOnly'

export default function createApp({ routerHistory, plugins }) {
  const app = process.env.NODE_ENV === 'development'
    ? createClientApp(App)
    : createSSRApp(App)

  const router = createRouter({
    routes,
    history: routerHistory,
    scrollBehavior (to, from, saved) {
      if (saved) {
        return saved
      } else if (to.hash) {
        return { selector: to.hash }
      } else {
        return { x: 0, y: 0 }
      }
    }
  })

  const metaManager = createMetaManager(defaultConfig)

  // Cleanup SSR meta tags now because the `DOMContentLoaded`
  // event in `vue-meta` is registered too late.
  metaManager.render()

  router.beforeEach(graphqlGuard)

  app.config.globalProperties.$url = url
  app.config.globalProperties.$fetch = createPathFetcher(router)

  app.use(router)
  app.use(metaManager)
  app.mixin(graphqlMixin)
  app.component('GLink', Link)
  app.component('GImage', Image)
  app.component('ClientOnly', ClientOnly)

  const args = {
    app,
    router,
    isServer: process.isServer,
    isClient: process.isClient
  }

  for (const { run, options } of plugins) {
    if (typeof run === 'function') {
      run({ ...args, options })
    }
  }

  if (main && typeof main.default === 'function') {
    main.default(args)
  }

  return {
    app,
    router
  }
}
