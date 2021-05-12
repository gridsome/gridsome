import { createApp as createClientApp, createSSRApp } from 'vue'
import { createRouter } from 'vue-router'
import { createHead, Head } from '@vueuse/head'

import * as main from '~/main'
import App from '~/App.vue'

import { createPathFetcher } from './fetchPath'
import { url } from './utils/helpers'
import graphqlGuard from './graphql/guard'
import graphqlMixin from './graphql/mixin'
import routes from '~/.temp/routes.js'
import config from '~/.temp/config.js'
import icons from '~/.temp/icons.js'

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

  const head = createHead()

  const defaultHead = {
    htmlAttrs: {
      lang: 'en'
    },
    bodyAttrs: {},
    meta: [
      { charset: 'utf-8' },
      { name: 'generator', content: `Gridsome v${config.version}` },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },

      // do not convert telephone numbers into hypertext
      // links because it will cause hydration errors
      { name: 'format-detection',  content: 'telephone=no' }
    ],
    link: [
      ...icons.favicons.map(({ width, height = width, src: href }) => ({
        rel: 'icon',
        type: icons.faviconMimeType,
        sizes: `${width}x${height}`,
        href
      })),
      ...icons.touchicons.map(({ width, height = width, src: href }) => ({
        rel: `apple-touch-icon${icons.precomposed ? '-precomposed' : ''}`,
        type: icons.touchiconMimeType,
        sizes: `${width}x${height}`,
        href
      }))
    ],
    style: [],
    script: []
  }

  router.beforeEach(graphqlGuard)

  app.config.globalProperties.$url = url
  app.config.globalProperties.$fetch = createPathFetcher(router)

  app.use(router)
  app.use(head)
  app.mixin(graphqlMixin)
  app.component('GHead', Head)
  app.component('GLink', Link)
  app.component('GImage', Image)
  app.component('ClientOnly', ClientOnly)

  const args = {
    app,
    router,
    head: defaultHead,
    isServer: process.isServer,
    isClient: process.isClient
  }

  for (const { run, options } of plugins) {
    if (typeof run === 'function') {
      if (run.length > 1) {
        throw new Error('The default export expects only one argument.')
      } else {
        run({ ...args, options })
      }
    }
  }

  if (main && typeof main.default === 'function') {
    if (main.default.length > 1) {
      throw new Error('The default export in main.js expects only one argument.')
    } else {
      main.default(args)
    }
  }

  head.addHeadObjs({ value: defaultHead })

  return {
    app,
    router,
    head
  }
}
