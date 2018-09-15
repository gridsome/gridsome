import Vue from 'vue'
import Meta from 'vue-meta'
import Router from 'vue-router'
import Link from './components/Link'
import Plugins from './utils/Plugins.js'
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
  const plugins = new Plugins()

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

  plugins.callHook('router', router)

  const options = {
    router,
    data: {
      error: null
    },
    metaInfo () {
      const head = {
        title: config.siteName,
        titleTemplate: this.$route.name === 'home' ? '%s' : config.titleTemplate,
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

      plugins.callHookSync('appendHead', head)

      return head
    },
    methods: {
      setError (error) {
        this.error = error
      }
    },
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
      // if (this.error && this.error.type === 404) {
      //   return (NotFound, {
      //     props: {
      //       type: this.error.type,
      //       message: this.error.message
      //     }
      //   })
      // }

      return h('router-view', {
        attrs: { id: 'app' }
      })
    }
  }

  plugins.callHook('rootOptions', options)

  return { app: new Vue(options), router }
}
