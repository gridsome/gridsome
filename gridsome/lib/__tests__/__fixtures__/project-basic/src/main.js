import Layout from './layouts/Default.vue'

import './styles/main.css'

export default function (Vue, { head, router }) {
  Vue.component('Layout', Layout)

  head.meta.push({ name: 'keywords', content: 'test' })
  head.meta.push({ key: 'description', name: 'description', content: 'Main description' })

  router.options.linkActiveClass = 'is-active'
}
