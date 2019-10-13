const cache = Object.create(null)

// @vue/component
export default {
  name: 'VueRenderer',
  functional: true,
  props: {
    source: {
      type: String,
      required: true
    },
    data: {
      type: Object,
      default: () => ({})
    },
    components: {
      type: Object,
      default: () => ({})
    }
  },
  render (h, { props, data, children }) {
    let fn = cache[props.source]

    if (typeof fn !== 'function') {
      fn = new Function('options',
        `${props.source}\n` +
        `return Object.assign({}, options, {` +
        `render: render, staticRenderFns: staticRenderFns, ` +
        `_compiled: true` +
        `})`
      )

      cache[props.source] = fn
    }

    const directives = [{ name: 'g-image' }].concat(data.directives || [])

    const component = fn({
      name: 'VueRenderer',
      data: () => props.data,
      components: props.components
    })

    return h(component, { ...data, directives }, children)
  }
}
