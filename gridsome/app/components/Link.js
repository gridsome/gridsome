/* global GRIDSOME_MODE */

import router from '../router'
import caniuse from '../utils/caniuse'
import { stripPathPrefix } from '../utils/helpers'
import { createObserver } from '../utils/intersectionObserver'

const observer = caniuse.IntersectionObserver
  ? createObserver(intersectionHandler)
  : null

let uid = 0

export default {
  functional: true,

  props: {
    to: { type: [Object, String] },
    page: { type: Number },
    activeClass: { type: String, default: 'active' },
    exactActiveClass: { type: String, default: 'active--exact' }
  },

  render: (h, { data, props, parent, children, ...res }) => {
    if (props.to && props.to.type === 'file') {
      data.attrs.href = props.to.src
      return h('a', data, children)
    }

    const ref = data.ref || `__link_${uid++}`
    const to = typeof props.to === 'string'
      ? { path: props.to, params: {}}
      : { params: {}, ...props.to }

    if (props.page) {
      to.params.page = props.page > 1 ? props.page : null
      data.attrs.exact = true
    }

    if (GRIDSOME_MODE === 'static' && process.isClient) {
      const onMount = vm => {
        if (vm && observer) observer.observe(vm.$el)
      }

      const onDestroy = vm => {
        if (vm && observer) observer.unobserve(vm.$el)
      }

      parent.$once('hook:mounted', () => onMount(parent.$refs[ref]))
      parent.$once('hook:updated', () => onMount(parent.$refs[ref]))
      parent.$once('hook:beforeDestroy', () => onDestroy(parent.$refs[ref]))
    }

    return h('router-link', {
      ...data,
      ref,
      attrs: {
        to,
        activeClass: props.activeClass,
        exactActiveClass: props.exactActiveClass,
        ...data.attrs
      },
      domProps: {
        __gLink__: true
      }
    }, children)
  }
}

const isPreloaded = {}

function intersectionHandler ({ intersectionRatio, target }) {
  if (process.isClient) {
    if (intersectionRatio > 0) {
      observer.unobserve(target)

      if (document.location.hostname === target.hostname) {
        if (isPreloaded[target.pathname]) return
        else isPreloaded[target.pathname] = true

        const path = stripPathPrefix(target.pathname)
        const { route } = router.resolve({ path })

        const fetchComponentData = options => {
          setTimeout(() => {
            import(/* webpackChunkName: "page-query" */ '../page-query/fetch').then(m => {
              m.default(route, options.__pageQuery)
            })
          }, 250)
        }

        if (route.meta.data && route.matched.length) {
          const options = route.matched[0].components.default

          if (typeof options === 'function') {
            options().then(m => fetchComponentData(m.default))
          } else {
            fetchComponentData(options)
          }
        }
      }
    }
  }
}
