import fetch from '../fetch'
import router from '../router'
import caniuse from '../utils/caniuse'
import { stripPathPrefix } from '../utils/helpers'
import { createObserver } from '../utils/intersectionObserver'

const isPreloaded = {}

const observer = caniuse.IntersectionObserver
  ? createObserver(intersectionHandler)
  : null

export default {
  inserted (el) {
    observer && observer.observe(el)
  },
  unbind (el) {
    observer && observer.unobserve(el)
  }
}

function intersectionHandler ({ intersectionRatio, target }) {
  if (process.isClient) {
    if (intersectionRatio > 0) {
      observer.unobserve(target)

      if (document.location.hostname === target.hostname) {
        if (isPreloaded[target.pathname]) return
        else isPreloaded[target.pathname] = true

        const path = stripPathPrefix(target.pathname)
        const { route } = router.resolve({ path })

        setTimeout(() => fetch(route, { shouldPrefetch: true }), 250)
      }
    }
  }
}
