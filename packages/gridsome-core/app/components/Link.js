export default {
  name: 'GridsomeLink',
  functional: true,

  props: {
    to: { type: String }
  },

  render: (h, ctx) => h('router-link', {
    ...ctx.data,
    attrs: {
      to: ctx.props.to,
      activeClass: 'active',
      exactActiveClass: 'active--exact'
    }
  }, ctx.children)
}
