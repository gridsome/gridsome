import VueRemarkContent from './src/VueRemarkContent'

export default function (Vue, options, { router }) {
  Vue.component('VueRemarkContent', VueRemarkContent)

  router.beforeEach((to, from, next) => {
    if (typeof to.meta.$vueRemark === 'function') {
      to.meta.$vueRemark().then(() => next())
    } else {
      next()
    }
  })
}
