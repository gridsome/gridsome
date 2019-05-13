import Vue from 'vue'

export { default as Vue } from 'vue'
export { default as Link } from './components/Link'
export { default as Image } from './components/Image'
export { default as Pager } from './components/Pager'
export { default as ClientOnly } from './components/ClientOnly'
export { url } from './utils/helpers'

export function fetch(path) {
  return Vue.prototype.$fetch(path)
}
