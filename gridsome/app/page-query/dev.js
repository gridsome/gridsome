import Vue from 'vue'
import sock from './sock'
import fetch from './fetch'
import { unobserve, observe } from '../components/Image'

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
    unobserve(undefined, vm.$el)
    fetch(options, vm.$route).then(() => {
      Vue.nextTick(() => observe(undefined, vm.$el))
    })
  }
}

export default ({ options }) => {
  if (options.__pageQueryDev) return

  const merge = Vue.config.optionMergeStrategies

  options.mounted = merge.mounted([function () {
    active[options.__file] = { options, vm: this }
  }], options.mounted)

  options.beforeDestroy = merge.beforeDestroy([function () {
    delete active[options.__file]
  }], options.beforeDestroy)

  options.__pageQueryDev = true
}
