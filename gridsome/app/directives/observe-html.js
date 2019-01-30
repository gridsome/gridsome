import Vue from 'vue'
import { observe, unobserve } from '../components/Image'

export default {
  inserted (el) {
    observe(undefined, el)
  },
  update (el) {
    observe(undefined, el)
  },
  unbind (el) {
    unobserve(undefined, el)
  }
}
