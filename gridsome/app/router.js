import Vue from 'vue'
import Router from 'vue-router'
import config from '~/.temp/config.js'
import { routes, NotFound } from '~/.temp/routes.js'

Vue.use(Router)

const router = new Router({
  base: process.env.PUBLIC_PATH,
  mode: 'history',
  fallback: false,
  routes: [...routes, {
    path: '*',
    name: '404',
    component: NotFound
  }],

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
