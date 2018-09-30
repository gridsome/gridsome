import createApp from './app'
import { initImageObserver } from './components/Image'

const { app, router } = createApp()

initImageObserver(router)

// let Vue router handle internal URLs for anchors in innerHTML
document.addEventListener('click', event => {
  const $el = event.target.closest('a')
  const isLocal = document.location.hostname === $el.hostname
  const notVueElement = $el && !$el.__vue__

  if (isLocal && notVueElement && !event.defaultPrevented) {
    router.push({ path: $el.pathname })
    event.preventDefault()
  }
}, false)

router.onReady(() => {
  app.$mount('#app')

  // TODO: register service worker
})
