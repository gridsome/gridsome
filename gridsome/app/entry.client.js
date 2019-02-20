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

// let Vue router handle internal URLs for anchors in innerHTML
document.addEventListener('click', event => {
  const $el = event.target.closest('a')
  const { hostname } = document.location

  if (
    event.defaultPrevented ||     // disables this behavior
    $el === null ||               // no link clicked
    $el.__gLink__ ||              // g-link anchor
    $el.hostname !== hostname ||  // external link
    /\.[^.]+$/.test($el.pathname) // link to a file
  ) return

  const path = stripPathPrefix($el.pathname)
  const { route, location } = router.resolve({ path, hash: $el.hash })

  if (route.name === '404') {
    return
  }

  router.push(location)
  event.preventDefault()
}, false)

router.onReady(() => {
  app.$mount('#app')
})
