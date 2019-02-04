import Vue from 'vue'
import plugins from '~/.temp/plugins-server'
import main from './main'

import head from './head'
import router from './router'
import { url } from './utils/helpers'

import Link from './components/Link'
import Image from './components/Image'
import ClientOnly from './components/ClientOnly'

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

  if (typeof main === 'function') {
    main(Vue, context)
  }

  const app = new Vue(appOptions)

  return { app, router }
}
