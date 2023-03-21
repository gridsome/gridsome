import config from '~/.temp/config.js'
import { normalizePath, isMailtoLink, isTelLink } from '../utils/helpers'

// @vue/component
export default {
  functional: true,

  props: {
    to: { type: [Object, String], default: null },
    page: { type: Number, default: 0 },
    activeClass: { type: String, default: undefined },
    exactActiveClass: { type: String, default: undefined },
    normalize: { type: Boolean, default: true }
  },

  render: (h, { data, props, children, parent }) => {
    const directives = data.directives || []
    const attrs = data.attrs || {}

    if (props.to && props.to.type === 'file') {
      attrs.href = props.to.src

      return h('a', data, children)
    }

    if (isExternalLink(props.to) || isMailtoLink(props.to) || isTelLink(props.to)) {
      // TODO: warn if props.to is an external url, email or phone
      attrs.href = props.to
    }

    if (isExternalLink(attrs.href)) {
      attrs.target = attrs.target || '_blank'
      attrs.rel = attrs.rel || 'noopener'

      return h('a', data, children)
    }

    if (isMailtoLink(attrs.href) || isTelLink(attrs.href)) {
      return h('a', data, children)
    }

    const to = typeof props.to === 'string'
      ? { path: props.to, params: {}}
      : { params: {}, ...props.to }

    if (props.page) {
      to.params.page = props.page > 1 ? props.page : null
      attrs.exact = true
    }

    if (to.path && props.normalize !== false) {
      to.path = normalizePath(to.path)
    }

    if (process.isStatic && process.isClient) {
      directives.push({ name: 'g-link' })
    }

    const { linkActiveClass, linkExactActiveClass } = parent.$router.options
    const activeClass = props.activeClass || linkActiveClass || 'active'
    const exactActiveClass = props.exactActiveClass || linkExactActiveClass || 'active--exact'

    attrs.to = to
    attrs.activeClass = activeClass
    attrs.exactActiveClass = exactActiveClass

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
  if (
    config.siteUrl &&
    String(string).startsWith(config.siteUrl)
  ) {
    return false
  }

  return externalRE.test(string)
}
