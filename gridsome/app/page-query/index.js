import Vue from 'vue'
import { getResults, formatError } from './shared'
import { NOT_FOUND_NAME, MODULE_NOT_FOUND } from '../utils/constants'

const merge = Vue.config.optionMergeStrategies

export default ({ options }, query = true) => {
  if (options.__pageQuery) {
    options.__pageQuery = query
    return
  }

  options.__pageQuery = query

  options.computed = merge.computed({
    $page () {
      return process.isServer
        ? this.$ssrContext.pageQuery.data
        : getResults(this.$route.path)
    }
  }, options.computed)

  if (process.isClient) {
    const createRouteGuard = hook => {
      options[hook] = merge[hook]([createGuardFunc(options)], options[hook])
    }

    const createGuardFunc = () => {
      return (to, from, next) => {
        import(/* webpackChunkName: "page-query" */ './fetch').then(m => {
          m.default(to, options.__pageQuery)
            .then(res => {
              if (res.code === 404) {
                next({ name: NOT_FOUND_NAME, params: { 0: to.path }})
              } else {
                next()
              }
            })
            .catch(err => {
              if (err.code === MODULE_NOT_FOUND || err.code === 404) {
                console.error(err) // eslint-disable-line
                next({ name: NOT_FOUND_NAME, params: { 0: to.path }})
              } else {
                formatError(err, to)
              }
            })
        })
      }
    }

    createRouteGuard('beforeRouteEnter')
    createRouteGuard('beforeRouteUpdate')
  }
}
