import Vue from 'vue'
import Meta from 'vue-meta'
import Router from 'vue-router'
import Link from './components/Link'
import config from '@gridsome/temp/config.js'
import ClientOnly from './components/ClientOnly'
import initRoutes from '@gridsome/temp/routes.js'
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
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'generator', content: `Gridsome v${config.version}` },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
    ],
    style: [],
    link: []
  }

  const options = {
    router,
    data: {},
    methods: {},
    metaInfo: head,
    mounted () {
      // let Vue router handle internal URLs
      document.addEventListener('click', event => {
        const $el = event.target.closest('a')

        if ($el && document.location.hostname === $el.hostname) {
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
