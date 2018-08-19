export default {
  name: 'GridsomeImage',
  functional: true,

  props: {
    src: { type: String }
  },

  render: (h, ctx) => h('img', {
    ...ctx.data,
    attrs: {
      src: ctx.props.src
    }
  })
}
