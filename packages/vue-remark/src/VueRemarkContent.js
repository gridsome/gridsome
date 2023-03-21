// @vue/component
export default {
  functional: true,
  render (h, { parent, data, children }) {
    const { $vueRemark } = parent.$route.meta

    if (typeof $vueRemark !== 'function') {
      throw new Error(
        'The <VueRemarkContent> component can only be used in ' +
        'templates for the @gridsome/vue-remark plugin.'
      )
    }

    return h($vueRemark, data, children)
  }
}
