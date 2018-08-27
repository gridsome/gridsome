export default {
  functional: true,

  props: {
    src: { type: String },
    width: { type: String },
    alt: {type: String}
  },

  render: (h, ctx) => {
    return h('img', {
      ...ctx.data,
      attrs: {
        alt: ctx.props.alt,
        src: ctx.props.src
      }
    })
  }
}
