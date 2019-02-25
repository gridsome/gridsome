import Vue from 'vue'
import { getResults, formatError } from './shared'

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
            .then(() => next())
            .catch(err => {
              if (err.code === 'MODULE_NOT_FOUND') {
                console.error(err) // eslint-disable-line
                next({ name: '*', params: { 0: to.path }})
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
