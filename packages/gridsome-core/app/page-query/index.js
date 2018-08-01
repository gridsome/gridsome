import Vue from 'vue'
import cache from './cache'
import fetch from './fetch'

const merge = Vue.config.optionMergeStrategies

export default ({ options }, query = true) => {
  if (options.__pageQuery) {
    options.__pageQuery = query
    return
  }

  options.__pageQuery = query

  options.computed = merge.computed({
    $page () { return cache.get(this.$route.meta.cacheKey) }
  }, options.computed)

  createRouteGuard(options, 'beforeRouteEnter')
  createRouteGuard(options, 'beforeRouteUpdate')
}

function createRouteGuard (options, hook) {
  options[hook] = merge[hook]([createGuardFunc(options)], options[hook])
}

function createGuardFunc (options) {
  return (to, from, next) => {
    fetch(options.__pageQuery, to).then(next)
  }
}
