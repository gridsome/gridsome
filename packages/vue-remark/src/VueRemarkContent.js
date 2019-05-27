// @vue/component
export default {
  functional: true,
  render (h, { parent, data, children }) {
    const { vueRemark } = parent.$route.meta

    return typeof vueRemark === 'function'
      ? h(vueRemark, data, children)
      : null
  }
}
