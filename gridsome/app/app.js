import Vue from 'vue'
import plugins from '~/.temp/plugins-server'

import * as main from '~/main'
import App from '~/App.vue'

import head from './head'
import router from './router'
import fetchPath from './fetchPath'
import { url } from './utils/helpers'
import graphqlGuard from './graphql/guard'
import graphqlMixin from './graphql/mixin'

import Link from './components/Link'
import Image from './components/Image'
import ClientOnly from './components/ClientOnly'

Vue.mixin(graphqlMixin)
Vue.component('GLink', Link)
Vue.component('GImage', Image)
Vue.component('ClientOnly', ClientOnly)

Vue.prototype.$url = url
Vue.prototype.$fetch = fetchPath

router.beforeEach(graphqlGuard)

const context = {
  appOptions: {
    render: h => h(App, { attrs: { id: 'app' }}),
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

export function runPlugins(plugins) {
  for (const { run, options } of plugins) {
    if (typeof run === 'function') {
      run(Vue, options, context)
    }
  }
}

export function runMain() {
  const defaultExport = 'default'
  if (main && typeof main[defaultExport] === 'function') {
    main[defaultExport](Vue, context)
  }
}

export default function createApp() {
  return {
    app: new Vue(context.appOptions),
    router
  }
}
