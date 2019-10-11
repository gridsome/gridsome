const cache = Object.create(null)

const VueRemarkRoot = {
  name: 'VueRemarkRoot',
  render (h) {
    return h('div', null, this.$slots.default)
  }
}

// @vue/component
export default {
  name: 'VueRemarkRenderer',
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
        `_compiled: _compiled`+
        `})`
      )

      cache[props.source] = fn
    }

    const directives = [{ name: 'g-image' }].concat(data.directives || [])

    const component = fn({
      name: 'VueRemarkRenderer',
      data: () => props.data,
      components: {
        VueRemarkRoot,
        ...props.components
      }
    })

    return h(component, { ...data, directives }, children)
  }
}
