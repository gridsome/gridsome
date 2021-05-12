import { useSSRContext, getCurrentInstance } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getResults } from './graphql/shared'
import { createPathFetcher } from './fetchPath'

function getPageState() {
  if (process.isServer) {
    const ssrContext = useSSRContext()
    return ssrContext.state || {}
  }

  const route = useRoute()

  return getResults(route)
}

export function usePageContext() {
  return getPageState().context
}

export function usePageQuery() {
  return getPageState().data
}

export function useStaticQuery() {
  const instance = getCurrentInstance()
  return instance.type.__staticQuery
    ? instance.type.__staticQuery.data
    : null
}

export function useFetch() {
  const router = useRouter()
  return createPathFetcher(router)
}
