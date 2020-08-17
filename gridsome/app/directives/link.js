import fetch from '../fetch'
import caniuse from '../utils/caniuse'
import { stripPathPrefix } from '../utils/helpers'
import { createObserver } from '../utils/intersectionObserver'

const isPreloaded = {}

const observed = new Map()
const observer = caniuse.IntersectionObserver
  ? createObserver(intersectionHandler)
  : null

export default {
  mounted (el, binding) {
    if (observer) {
      observed.set(el, binding.value)
      observer.observe(el)
    }
  },
  beforeUnmount (el) {
    if (observer) {
      observer.unobserve(el)
      observed.delete(el)
    }
  }
}

function intersectionHandler ({ intersectionRatio, target }) {
  if (process.isClient) {
    if (intersectionRatio > 0) {
      observer.unobserve(target)

      if (document.location.hostname === target.hostname) {
        if (isPreloaded[target.pathname]) return
        else isPreloaded[target.pathname] = true

        const router = observed.get(target)

        if (router) {
          const path = stripPathPrefix(target.pathname)
          const route = router.resolve({ path })

          setTimeout(() => fetch(route, { shouldPrefetch: true }), 250)
        }
      }
    }
  }
}
