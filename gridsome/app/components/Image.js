export default {
  functional: true,

  props: {
    src: { type: String },
    width: { type: String }
  },

  render: (h, ctx) => {
    return h('img', {
      ...ctx.data,
      attrs: {
        src: ctx.props.src
      }
    })
  }
}
