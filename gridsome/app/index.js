import Vue, { getCurrentInstance } from 'vue'

export { default as Vue } from 'vue'
export { default as Link } from './components/Link'
export { default as Image } from './components/Image'
export { default as Pager } from './components/Pager'
export { default as ClientOnly } from './components/ClientOnly'
export { url } from './utils/helpers'

export function fetch(path) {
  return Vue.prototype.$fetch(path)
}

export function useMeta(meta) {
  const instance = getCurrentInstance()
  if (instance.proxy.$options.metaInfo) {
    throw new Error(
      `\`metaInfo\` has already been defined in the normal <string> tag.`
    )
  }
  instance.proxy.$options.metaInfo = meta
  instance.proxy._vueMeta = true
}

export function useRouter() {
  const instance = getCurrentInstance()
  return instance.proxy.$router
}

export function useRoute() {
  const instance = getCurrentInstance()
  return instance.proxy.$route
}
