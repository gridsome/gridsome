import Vue from 'vue'
import plugins from '~/.temp/plugins-server'
import main from './main'
import routes from '~/.temp/routes.js'

import head from './head'
import router from './router'
import { url } from './utils/helpers'

import Link from './components/Link'
import Image from './components/Image'
import ClientOnly from './components/ClientOnly'

Vue.component('g-link', Link)
Vue.component('g-image', Image)
Vue.component('ClientOnly', ClientOnly)

Vue.prototype.$url = url

router.addRoutes(routes)

const context = {
  appOptions: {
    render: h => h('router-view', { attrs: { id: 'app' }}),
    metaInfo: head,
    methods: {},
    data: {},
    router
  },
  isServer: process.isServer,
  isClient: process.isClient,
  router,
  head
}

runPlugins(plugins)

export function runPlugins (plugins) {
  for (const { run, options } of plugins) {
    if (typeof run === 'function') {
      run(Vue, options, context)
    }
  }
}

export function runMain () {
  if (typeof main === 'function') {
    main(Vue, context)
  }
}

export default function createApp () {
  return {
    app: new Vue(context.appOptions),
    router
  }
}
