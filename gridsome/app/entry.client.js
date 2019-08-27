import './polyfills'

import Vue from 'vue'
import createApp, { runPlugins, runMain } from './app'
import plugins from '~/.temp/plugins-client'
import linkDirective from './directives/link'
import imageDirective from './directives/image'
import { stripPathPrefix } from './utils/helpers'

Vue.directive('g-link', linkDirective)
Vue.directive('g-image', imageDirective)

runPlugins(plugins)
runMain()

const { app, router } = createApp()

if (process.env.NODE_ENV === 'production') {
  router.beforeEach((to, from, next) => {
    const components = router.getMatchedComponents(to).map(
      c => typeof c === 'function' ? c() : c
    )

    Promise.all(components)
      .then(() => next())
      .catch(err => {
        // reload page if a component failed to load
        if (err.request && to.path !== window.location.pathname) {
          window.location.assign(to.fullPath)
        } else {
          next(err)
        }
      })
  })
}

// let Vue router handle internal URLs for anchors in innerHTML
document.addEventListener('click', event => {
  const $el = event.target.closest('a')
  const { hostname, port } = document.location

  if (
    event.defaultPrevented || // disables this behavior
    event.which !== 1 || // not a left click
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    $el === null || // no link clicked
    $el.__gLink__ || // g-link component
    $el.hostname !== hostname || // external link
    $el.port !== port || // external link
    /\.[^.]+$/.test($el.pathname) || // link to a file
    /\b_blank\b/i.test($el.target) // opens in new tab
  ) return

  const path = stripPathPrefix($el.pathname)
  const { route, location } = router.resolve({
    path: path + ($el.search || '') + ($el.hash || '')
  })

  if (route.name === '*') {
    return
  }

  router.push(location)
  event.preventDefault()
}, false)

router.onReady(() => {
  app.$mount('#app')
})
