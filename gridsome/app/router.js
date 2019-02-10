import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const router = new Router({
  base: process.env.PUBLIC_PATH,
  mode: 'history',
  fallback: false,

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

export default router
