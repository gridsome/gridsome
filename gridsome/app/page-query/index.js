import Vue from 'vue'
import cache from './cache'

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
        : cache.get(this.$route.path)
    }
  }, options.computed)

  if (process.isClient) {
    const createRouteGuard = hook => {
      options[hook] = merge[hook]([createGuardFunc(options)], options[hook])
    }

    const createGuardFunc = () => {
      return (to, from, next) => {
        const error = () => {
          next({
            name: '404',
            params: {
              0: to.path,
              route: to
            }
          })
        }

        import(/* webpackChunkName: "page-query" */ './fetch').then(m => {
          m.default(to, options.__pageQuery)
            .then(() => next())
            .catch(() => error())
        })
      }
    }

    createRouteGuard('beforeRouteEnter')
    createRouteGuard('beforeRouteUpdate')
  }
}
