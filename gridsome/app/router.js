import Vue from 'vue'
import Router from 'vue-router'
import routes from '~/.temp/routes.js'

Vue.use(Router)

const router = new Router({
  base: process.env.PUBLIC_PATH,
  mode: 'history',
  fallback: false,
  routes,

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

/**
 * Flag custom routes to not fetch GraphQL results or context for them.
 * TODO: This might be unnecessary once static routes are lazy-loaded.
 */
function customRoute (options) {
  const meta = { ...options.meta, __custom: true }
  const route = { ...options, meta }
  if (Array.isArray(options.children)) {
    route.children = options.children.map(customRoute)
  }
  return route
}

const addRoutes = router.addRoutes
router.addRoutes = routes => {
  return addRoutes.call(router, routes.map(customRoute))
}

export default router
