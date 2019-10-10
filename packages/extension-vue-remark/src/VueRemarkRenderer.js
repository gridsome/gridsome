const cache = Object.create(null)

const VueRemarkRoot = {
  name: 'VueRemarkRoot',
  render (h) {
    return h('div', null, this.$slots.default)
  }
}

// @vue/component
export default {
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
  render (h, { parent, props, data, children }) {
    let fn = cache[props.source]

    if (typeof fn !== 'function') {
      fn = new Function('options',
        `${props.source}\n` +
        `return Object.assign({}, options, {` +
        `render: render, staticRenderFns: staticRenderFns, ` +
        `_compiled: _compiled`+
        `})`
      )

      cache[props.source] = fn
    }

    const components = props.components || parent.$options.components
    const directives = [{ name: 'g-image' }].concat(data.directives || [])

    const component = fn({
      data: () => props.data,
      components: {
        VueRemarkRoot,
        ...components
      }
    })

    return h(component, { ...data, directives }, children)
  }
}
