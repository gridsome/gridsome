/* global GRIDSOME_MODE */

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

    if (props.to && props.to.type === 'file') {
      data.attrs.href = props.to.src
      
      return h('a', data, children)
    }

    if (isExternalLink(data.attrs.href)){
      data.attrs.target = data.attrs.target || '_blank'
      data.attrs.rel = data.attrs.rel || 'noopener'
      
      return h('a', data, children)
    }

    const to = typeof props.to === 'string'
      ? { path: props.to, params: {}}
      : { params: {}, ...props.to }

    if (props.page) {
      to.params.page = props.page > 1 ? props.page : null
      data.attrs.exact = true
    }

    if (GRIDSOME_MODE === 'static' && process.isClient) {
      directives.push({ name: 'g-link' })
    }

    data.attrs.to = to
    data.attrs.activeClass = props.activeClass
    data.attrs.exactActiveClass = props.exactActiveClass

    return h('router-link', {
      ...data,
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
