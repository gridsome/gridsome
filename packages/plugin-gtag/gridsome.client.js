import VueGtag from 'vue-gtag'

export default function (Vue, options, { isClient, router }) {
  if (isClient) {
    Vue.use(VueGtag, options, router)
  }
}
