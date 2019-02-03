import Vue from 'vue'
import createApp from './app'
import plugins from '~/.temp/plugins-client'
import observeHtml from './directives/observe-html'
import { stripPathPrefix } from './utils/helpers'

Vue.directive('observe-html', observeHtml)

const { app, router } = createApp(context => {
  for (const { run, options } of plugins) {
    if (typeof run === 'function') {
      run(Vue, options, context)
    }
  }
})

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

  // TODO: register service worker
})
