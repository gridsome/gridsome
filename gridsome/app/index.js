export { default as Link } from './components/Link'
export { default as Image } from './components/Image'
export { default as Pager } from './components/Pager'
export { default as ClientOnly } from './components/ClientOnly'
export { url } from './utils/helpers'

export * from './useApi'
export * from 'vue-router'
export * from 'vue-meta'
export * from 'vue'

export function fetch() {
  // TODO: Remove this before v1.
  throw new Error('The fetch() method is no longer available. Use useFetch() instead.')
}
