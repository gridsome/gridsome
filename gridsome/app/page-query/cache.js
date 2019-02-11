import Vue from 'vue'

const cache = Vue.observable({})

export default {
  set: (key, val) => Vue.set(cache, key, val),
  delete: key => Vue.delete(cache, key),
  get: key => cache[key],
  has: key => !!cache[key]
}
