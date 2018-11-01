import Vue from 'vue'
import head from './head'
import router from './router'
import Link from './components/Link'
import Image from './components/Image'
import ClientOnly from './components/ClientOnly'
import plugins from '~/.temp/plugins-server.js'
import { url } from './utils/helpers'

const isServer = process.isServer
const isClient = process.isClient

Vue.component('g-link', Link)
Vue.component('g-image', Image)
Vue.component('ClientOnly', ClientOnly)

Vue.prototype.$url = url

export default function createApp (callback) {
  const appOptions = {
    render: h => h('router-view', { attrs: { id: 'app' }}),
    metaInfo: head,
    methods: {},
    data: {},
    router
  }

  const context = {
    appOptions,
    isServer,
    isClient,
    router,
    head
  }

  if (callback) callback(context)

  for (const { run, options } of plugins) {
    if (typeof run === 'function') {
      run(Vue, options, context)
    }
  }

  try {
    const main = require('@/main.js')
    if (typeof main.default === 'function') {
      main.default(Vue, context)
    }
  } catch (err) {}

  const app = new Vue(appOptions)

  return { app, router }
}
