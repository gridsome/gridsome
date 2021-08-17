import { getResults } from './shared'

export default {
  computed: {
    $context () {
      if (process.isServer) {
        const { page = {} } = this.$ssrContext.state
        return page.context || {}
      }

      const { path } = this.$route
      const results = getResults(path)

      return results ? results.context : {}
    },
    $page () {
      if (process.isServer) {
        const { page = {} } = this.$ssrContext.state
        return page.data || null
      }

      const { path } = this.$route
      const results = getResults(path)

      return results ? results.data : null
    }
  }
}
