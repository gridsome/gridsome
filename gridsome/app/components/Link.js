export default {
  name: 'GridsomeLink',
  functional: true,

  props: {
    to: { type: [Object, String] },
    page: { type: Number }
  },

  render: (h, { data, props, children, ...res }) => {
    const to = normalize(props.to)

    if (props.page) {
      to.params.page = props.page > 1 ? props.page : null
      data.attrs.exact = true
    }

    return h('router-link', {
      ...data,
      attrs: {
        to,
        activeClass: 'active',
        exactActiveClass: 'active--exact',
        ...data.attrs
      }
    }, children)
  }
}

function normalize (to) {
  return typeof to === 'string'
    ? { path: to, params: {}}
    : { params: {}, ...to }
}
