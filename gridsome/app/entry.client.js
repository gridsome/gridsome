import createApp from './app'
import { initImageObserver } from './components/Image'

const { app, router } = createApp()

initImageObserver(router)

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

  router.push({ path: $el.pathname })
  event.preventDefault()
}, false)

router.onReady(() => {
  app.$mount('#app')

  // TODO: register service worker
})
