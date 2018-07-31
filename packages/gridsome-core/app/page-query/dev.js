import Vue from 'vue'
import sock from '../sock'
import fetch from './fetch'

const merge = Vue.config.optionMergeStrategies

export default ({ options }) => {
  options.mounted = merge.mounted([function () {
    sock.onmessage = message => {
      const { query } = JSON.parse(message.data)
      options.__pageQuery = query
      fetch(options.__pageQuery, this.$route)
    }
  }], options.mounted)

  options.beforeDestroy = merge.beforeDestroy([function () {
    sock.onmessage = null
  }], options.beforeDestroy)
}
