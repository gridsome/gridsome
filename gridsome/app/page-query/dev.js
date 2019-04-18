import Vue from 'vue'
import fetch from './fetch'
import SockJS from 'sockjs-client'
import { formatError } from './shared'

const sock = new SockJS(process.env.SOCKJS_ENDPOINT)
const active = {}

sock.onmessage = message => {
  const data = JSON.parse(message.data)

  switch (data.type) {
    case 'updateQuery':
      if (active.hasOwnProperty(data.file)) {
        active[data.file].options.__pageQuery = data.query
      }

      break
  }

  for (const file in active) {
    const { options, vm } = active[file]
    fetch(vm.$route, options.__pageQuery)
      .then(({ errors }) => errors && formatError(errors[0], vm.$route))
      .catch(err => formatError(err, vm.$route))
  }
}

export default ({ options }) => {
  if (options.__pageQueryDev) return

  const merge = Vue.config.optionMergeStrategies
  const slash = string => string.replace(/\\+/g, '/')

  options.mounted = merge.mounted([function () {
    active[slash(options.__file)] = { options, vm: this }
  }], options.mounted)

  options.beforeDestroy = merge.beforeDestroy([function () {
    delete active[slash(options.__file)]
  }], options.beforeDestroy)

  options.__pageQueryDev = true
}
