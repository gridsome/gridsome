import { getCurrentInstance, onUnmounted, shallowReactive, ref, watch, computed } from 'vue'
import { getResults } from './graphql/shared'
import { throwNoCurrentInstance } from './utils/helpers'

export function useMetaInfo(metaInfo) {
  const instance = getCurrentInstance()

  if (!instance) {
    throwNoCurrentInstance('useMetaInfo')
  }

  const { $root, $options } = instance.proxy

  if (process.env.NODE_ENV === 'development' && $options.metaInfo) {
    throw new Error(
      `\`metaInfo\` has already been defined in the normal <string> tag.`
    )
  }

  if (!instance.proxy._vueMeta) {
    instance.proxy._vueMeta = true
    let parent = instance.proxy.$parent
    while (parent && parent !== $root) {
      if (parent._vueMeta === undefined) {
        parent._vueMeta = false
      }
      parent = parent.$parent
    }
  }

  const metaInfoRef = typeof metaInfo === 'function'
    ? computed(metaInfo)
    : ref(metaInfo)

  $options.metaInfo = metaInfo

  watch(metaInfoRef, (nextValue) => {
    instance.proxy.$metaInfo = nextValue
    if (process.isClient) {
      $root.$meta().refresh()
    }
  }, { immediate: true })
}

export function useRouter() {
  const instance = getCurrentInstance()

  if (!instance) {
    throwNoCurrentInstance('useRouter')
  }

  return instance.proxy.$root.$router
}

export function useRoute() {
  const router = useRouter()
  const instance = getCurrentInstance()

  if (!instance) {
    throwNoCurrentInstance('useRoute')
  }

  const route = shallowReactive({ ...instance.proxy.$route })
  const unregister = router.afterEach((to, from) => {
    if (isSameRoute(to, from)) {
      Object.assign(route, to)
    }
  })

  onUnmounted(unregister)

  return route
}

export function usePageQuery() {
  const router = useRouter()
  const instance = getCurrentInstance()

  if (!instance) {
    throwNoCurrentInstance('usePageQuery')
  }

  if (process.isServer) {
    return instance.proxy.$ssrContext.state.data || null
  }

  const { path } = useRoute()
  const results = getResults(path)
  const data = shallowReactive({ ...results.data })
  const unregister = router.afterEach((to, from) => {
    if (isSameRoute(to, from)) {
      const results = getResults(to.path)
      Object.assign(data, results.data)
    }
  })

  onUnmounted(unregister)

  return data
}

export function useStaticQuery() {
  const instance = getCurrentInstance()

  if (!instance) {
    throwNoCurrentInstance('useStaticQuery')
  }

  const { $options } = instance.proxy

  return $options.computed?.$static?.() ?? null
}

function isSameRoute(a, b) {
  return a.matched[0] === b.matched[0]
}
