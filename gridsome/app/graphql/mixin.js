import { defineComponent } from 'vue'
import { usePageContext, usePageQuery, useStaticQuery } from '../useApi'

/**
 * These are just to support the `$page`, `$static` and `$context` properties
 * in components. We should maybe show a deprecation message and tell
 * people to use `usePageContext` and `usePageQuery` instead.
 */
export default defineComponent({
  computed: {
    $context() {
      return usePageContext()
    },
    $page() {
      return usePageQuery()
    },
    $static() {
      return useStaticQuery()
    }
  }
})
