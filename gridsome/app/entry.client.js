import './polyfills'

import Vue from 'vue'
import createApp, { runPlugins, runMain } from './app'
import config from '#gridsome/config'
import plugins from '#gridsome/plugins-client'
import linkDirective from './directives/link'
import imageDirective from './directives/image'
import catchLinksDirective, { onCatchLink } from './directives/catch-links'
import { isFunc, isNil } from './utils/lang'

Vue.directive('g-link', linkDirective)
Vue.directive('g-image', imageDirective)
Vue.directive('catch-links', catchLinksDirective)

runPlugins(plugins)
runMain()

const { app, router } = createApp()

if (process.env.NODE_ENV === 'production') {
  router.beforeEach((to, from, next) => {
    const components = router.getMatchedComponents(to).map(
      c => isFunc(c) && isNil(c.cid) ? c() : c
    )

    Promise.all(components)
      .then(() => next())
      .catch(err => {
        // reload page if a component failed to load
        if (err.request && to.path !== window.location.pathname) {
          const fullPathWithPrefix = (config.pathPrefix ?? '') + to.fullPath
          window.location.assign(fullPathWithPrefix)
        } else {
          next(err)
        }
      })
  })
}

if (config.catchLinks !== false) {
  addEventListener('click', onCatchLink, false)
}

router.onError((err) => {
  console.error(err)
})

router.onReady(() => {
  app.$mount('#app')
})
