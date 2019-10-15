// @vue/component
export default {
  name: 'VueRemarkRoot',
  render (h) {
    return h('div', null, this.$slots.default)
  }
}
