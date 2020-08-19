import './polyfills'

import Vue from 'vue'
import createApp, { runPlugins, runMain } from './app'
import config from '~/.temp/config'
import plugins from '~/.temp/plugins-client'
import linkDirective from './directives/link'
import imageDirective from './directives/image'
import { stripPathPrefix } from './utils/helpers'
import { isFunc, isNil } from './utils/lang'

Vue.directive('g-link', linkDirective)
Vue.directive('g-image', imageDirective)

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

// TODO: remove this behavior
// let Vue router handle internal URLs for anchors in innerHTML
document.addEventListener('click', event => {
  const $el = event.target.closest('a')
  const { hostname, port } = document.location

  if (
    !config.catchLinks || // disables this behavior by config settings
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

  if (
    config.pathPrefix &&
    !$el.pathname.startsWith(config.pathPrefix)
  ) {
    return // must include pathPrefix in path
  }

  const path = stripPathPrefix($el.pathname)
  const { route, location } = router.resolve({
    path: path + ($el.search || '') + decodeURI($el.hash || '')
  })

  if (route.name === '*') {
    return
  }

  router.push(location, () => {})
  event.preventDefault()
}, false)

router.onError((err) => {
  console.error(err)
})

router.onReady(() => {
  app.$mount('#app')
})
