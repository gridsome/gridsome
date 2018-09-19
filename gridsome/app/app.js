import Vue from 'vue'
import Meta from 'vue-meta'
import Router from 'vue-router'
import Link from './components/Link'
import icons from '~/.temp/icons.js'
import config from '~/.temp/config.js'
import initRoutes from '~/.temp/routes.js'
import ClientOnly from './components/ClientOnly'
import Image, { initIntersectionObserver } from './components/Image'

Vue.use(Meta)
Vue.use(Router)

Vue.component('g-link', Link)
Vue.component('g-image', Image)
Vue.component('ClientOnly', ClientOnly)

export default function createApp () {
  const router = new Router({
    base: '/',
    mode: 'history',
    fallback: false,
    routes: [],

    scrollBehavior (to, from, saved) {
      if (saved) {
        return saved
      } else if (to.hash) {
        return { selector: to.hash }
      } else {
        return { x: 0, y: 0 }
      }
    }
  })

  initIntersectionObserver(router)
  initRoutes(router)

  const head = {
    title: config.siteName,
    titleTemplate: config.titleTemplate,
    __dangerouslyDisableSanitizers: ['style', 'script'],
    __dangerouslyDisableSanitizersByTagID: {},
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'generator', content: `Gridsome v${config.version}` },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
    ],
    script: [],
    style: [],
    link: []
  }

  icons.favicons.forEach(({ type, width, height, src: href }) => {
    head.link.push({
      rel: 'icon',
      type: `image/${type}`,
      sizes: `${width}x${height}`,
      href
    })
  })

  icons.touchicons.forEach(({ width, height, src: href }) => {
    head.link.push({
      rel: `apple-touch-icon${icons.precomposed ? '-precomposed' : ''}`,
      sizes: `${width}x${height}`,
      href
    })
  })

  const options = {
    router,
    data: {},
    methods: {},
    metaInfo: head,
    mounted () {
      // let Vue router handle internal URLs for anchors in innerHTML
      document.addEventListener('click', event => {
        const $el = event.target.closest('a')

        if ($el && !$el.__vue__ && document.location.hostname === $el.hostname) {
          router.push({ path: $el.pathname })
          event.preventDefault()
        }
      }, false)
    },
    render (h) {
      return h('router-view', {
        attrs: { id: 'app' }
      })
    }
  }

  try {
    const main = require('@/main.js')
    if (typeof main.default === 'function') {
      main.default(Vue, { options, router, head })
    }
  } catch (err) {}

  return { app: new Vue(options), router }
}
