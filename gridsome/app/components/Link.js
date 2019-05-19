import config from '~/.temp/config.js'

// @vue/component
export default {
  functional: true,

  props: {
    to: { type: [Object, String], default: null },
    page: { type: Number, default: 0 },
    activeClass: { type: String, default: 'active' },
    exactActiveClass: { type: String, default: 'active--exact' }
  },

  render: (h, { data, props, children }) => {
    const directives = data.directives || []
    const attrs = data.attrs || {}

    if (props.to && props.to.type === 'file') {
      attrs.href = props.to.src
      
      return h('a', data, children)
    }

    if (isExternalLink(attrs.href)){
      attrs.target = attrs.target || '_blank'
      attrs.rel = attrs.rel || 'noopener'
      
      return h('a', data, children)
    }

    const to = typeof props.to === 'string'
      ? { path: props.to, params: {}}
      : { params: {}, ...props.to }

    if (props.page) {
      to.params.page = props.page > 1 ? props.page : null
      attrs.exact = true
    }

    if (process.isStatic && process.isClient) {
      directives.push({ name: 'g-link' })
    }

    attrs.to = to
    attrs.activeClass = props.activeClass
    attrs.exactActiveClass = props.exactActiveClass

    return h('router-link', {
      ...data,
      attrs,
      directives,
      domProps: {
        __gLink__: true
      }
    }, children)
  }
}

const externalRE = new RegExp('^(https?:|//)')

function isExternalLink (string) {
  if (String(string).startsWith(config.siteUrl)) return false
  return externalRE.test(string)
}
