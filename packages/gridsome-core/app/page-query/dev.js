import Vue from 'vue'
import sock from '../sock'
import fetch from './fetch'

const merge = Vue.config.optionMergeStrategies

export default ({ options }) => {
  if (options.__pageQueryDev) return

  options.mounted = merge.mounted([function () {
    sock.onmessage = message => {
      const { query, file } = JSON.parse(message.data)
      if (file !== this.$options.__file) return
      options.__pageQuery = query
      fetch(options, this.$route)
    }
  }], options.mounted)

  options.beforeDestroy = merge.beforeDestroy([function () {
    sock.onmessage = null
  }], options.beforeDestroy)

  options.__pageQueryDev = true
}
