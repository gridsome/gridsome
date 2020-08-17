import { h, resolveComponent, resolveDirective, withDirectives } from 'vue'
import { useRouter } from 'vue-router'
import config from '~/.temp/config.js'
import { normalizePath, isMailtoLink, isTelLink } from '../utils/helpers'

const Link = (props, { slots, attrs }) => {
  const RouterLink = resolveComponent('RouterLink')
  const linkDirective = resolveDirective('g-link')
  const router = useRouter()
  const linkAtts = { ...attrs }

  if (props.to && props.to.type === 'file') {
    linkAtts.href = props.to.src

    return h('a', linkAtts)
  }

  if (isExternalLink(props.to) || isMailtoLink(props.to) || isTelLink(props.to)) {
    // TODO: warn if props.to is an external url, email or phone
    linkAtts.href = props.to
  }

  if (isExternalLink(attrs.href)) {
    linkAtts.target = attrs.target || '_blank'
    linkAtts.rel = attrs.rel || 'noopener'

    return h('a', linkAtts)
  }

  if (isMailtoLink(attrs.href) || isTelLink(attrs.href)) {
    return h('a', attrs)
  }

  const to = typeof props.to === 'string'
    ? { path: props.to }
    : { params: {}, ...props.to }

  if (props.page) {
    to.params.page = props.page > 1 ? props.page : null
    linkAtts.exact = true
  }

  if (to.path && props.normalize !== false) {
    to.path = normalizePath(to.path)
  }

  linkAtts.to = to
  linkAtts.activeClass = props.activeClass
  linkAtts.exactActiveClass = props.exactActiveClass

  const vnode = h(RouterLink, linkAtts, slots.default)

  return process.isStatic && process.isClient
    ? withDirectives(vnode, [[linkDirective, router]])
    : vnode
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

Link.props = {
  to: { type: [Object, String], default: null },
  page: { type: Number, default: 0 },
  activeClass: { type: String, default: 'active' },
  exactActiveClass: { type: String, default: 'active--exact' },
  normalize: { type: Boolean, default: true }
}

export default Link
