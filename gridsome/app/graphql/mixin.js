import { getResults } from './shared'

export default {
  computed: {
    $context () {
      if (process.isServer) {
        return this.$ssrContext.state.context
      }

      const { path } = this.$route
      const results = getResults(path)
      return results ? results.context : null
    },
    $page () {
      if (process.isServer) {
        return this.$ssrContext.state.data
      }

      const { path } = this.$route
      const results = getResults(path)
      return results ? results.data : null
    }
  }
}
