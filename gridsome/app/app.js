import Vue from 'vue'
import head from './head'
import router from './router'
import Link from './components/Link'
import Image from './components/Image'
import ClientOnly from './components/ClientOnly'
import { url } from './utils/helpers'

const isServer = process.isServer
const isClient = process.isClient

Vue.component('g-link', Link)
Vue.component('g-image', Image)
Vue.component('ClientOnly', ClientOnly)

Vue.prototype.$url = url

export default function createApp () {
  const options = {
    render: h => h('router-view', { attrs: { id: 'app' }}),
    metaInfo: head,
    methods: {},
    data: {},
    router
  }

  try {
    const main = require('@/main.js')
    if (typeof main.default === 'function') {
      main.default(Vue, { options, router, head, isServer, isClient })
    }
  } catch (err) {}

  const app = new Vue(options)

  return { app, router }
}
