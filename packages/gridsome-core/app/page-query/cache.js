import Vue from 'vue'

const cache = {}

Vue.util.defineReactive(cache, 'data', {})

export default {
  set (key, val) {
    Vue.set(cache.data, key, val)
  },
  get (key) {
    return cache.data[key]
  },
  delete (key) {
    Vue.delete(cache.data, key)
  },
  has (key) {
    return !!cache.data[key]
  }
}
