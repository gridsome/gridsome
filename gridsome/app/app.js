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

  const app = new Vue({
    router,
    data: {
      error: null
    },
    metaInfo () {
      return {
        title: config.siteName,
        titleTemplate: this.$route.name === 'home' ? '%s' : config.titleTemplate,
        htmlAttrs: {
          lang: 'en'
        },
        meta: [
          { charset: 'utf-8' },
          { name: 'generator', content: `Gridsome ${config.version}` },
          { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
        ],
        link: [
          // { rel: 'favicon', href: 'favicon.ico' }
        ]
      }
    },
    methods: {
      setError (error) {
        this.error = error
      }
    },
    mounted () {
      // let the Vue router handle all internal urls
      // document.addEventListener('click', (event) => {
      //   const $link = event.target.closest('a')
      //   if (!$link || !$link.pathname) return
      //   this.$router.push({ path: $link.pathname })
      //   event.preventDefault()
      // }, false)
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
  })

  return { app, router }
}
