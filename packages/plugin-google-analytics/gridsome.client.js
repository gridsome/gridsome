import VueAnalytics from 'vue-analytics'

export default function (Vue, options, { isServer: disabled, router }) {
  Vue.use(VueAnalytics, {
    debug: {
      sendHitTask: process.env.NODE_ENV === 'production'
    },
    router,
    disabled,
    ...options
  })
}
