import Vue from 'vue'

const cache = {}

Vue.util.defineReactive(cache, 'data', {})

export default {
  set: (key, val) => Vue.set(cache.data, key, val),
  delete: key => Vue.delete(cache.data, key),
  get: key => cache.data[key],
  has: key => !!cache.data[key]
}
