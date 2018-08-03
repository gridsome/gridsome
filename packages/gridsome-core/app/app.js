import Vue from 'vue'
import Meta from 'vue-meta'
import Router from 'vue-router'
import initRoutes from '@temp/routes.js'

Vue.use(Meta)
Vue.use(Router)

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

  initRoutes(router)

  const app = new Vue({
    router,
    data: {
      error: null
    },
    methods: {
      setError (error) {
        this.error = error
      }
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
