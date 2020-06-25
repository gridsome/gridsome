import Link from './Link'
import { unslashEnd, stripPageParam } from '../utils/helpers'

// @vue/component
export default {
  functional: true,
  props: {
    info: { type: Object, required: true },
    showLinks: { type: Boolean, default: true },
    showNavigation: { type: Boolean, default: true },
    firstLabel: { type: String, default: '«' },
    firstClass: { type: String, default: '' },
    prevLabel: { type: String, default: '‹' },
    prevClass: { type: String, default: '' },
    nextLabel: { type: String, default: '›' },
    nextClass: { type: String, default: '' },
    lastLabel: { type: String, default: '»' },
    lastClass: { type: String, default: '' },
    navClass: { type: String, default: '' },
    linkClass: { type: String, default: '' },
    range: { type: Number, default: 5 },
    activeLinkClass: { type: String, default: undefined },
    exactActiveLinkClass: { type: String, default: undefined },

    // accessibility
    ariaLabel: { type: String, default: 'Pagination Navigation' },
    ariaLinkLabel: { type: String, default: 'Go to page %n' },
    ariaFirstLabel: { type: String, default: 'Go to first page' },
    ariaCurrentLabel: { type: String, default: 'Current page. Page %n' },
    ariaPrevLabel: { type: String, default: 'Go to previous page. Page %n' },
    ariaNextLabel: { type: String, default: 'Go to next page. Page %n' },
    ariaLastLabel: { type: String, default: 'Go to last page. Page %n' }
  },
  render: (h, { props, data, parent }) => {
    const { info, showLinks, showNavigation, ariaLabel } = props
    const { current, total, pages, start, end } = resolveRange(info, props.range)
    const currentPath = stripPageParam(parent.$route)

    const renderLink = (page, text = page, ariaLabel = text, linkClass = '') => {
      if (page === current) ariaLabel = props.ariaCurrentLabel

      const linkProps = {
        to: createPagePath(currentPath, page),
        exact: true
      }

      if (props.activeLinkClass) {
        linkProps.activeClass = props.activeLinkClass
      }

      if (props.exactActiveLinkClass) {
        linkProps.exactActiveClass = props.exactActiveLinkClass
      }

      return h(Link, {
        class: [props.linkClass, linkClass],
        attrs: {
          ...linkProps,
          'aria-label': ariaLabel.replace('%n', page),
          'aria-current': current === page
        }
      }, [text])
    }

    const links = showLinks
      ? pages.map(page => renderLink(page, page, props.ariaLinkLabel))
      : []

    // render first, prev, next and last links
    if (showNavigation) {
      const { firstLabel, prevLabel, nextLabel, lastLabel } = props
      const { ariaFirstLabel, ariaPrevLabel, ariaNextLabel, ariaLastLabel } = props
      const { firstClass, prevClass, nextClass, lastClass, navClass } = props

      if (current > 1) links.unshift(renderLink(current - 1, prevLabel, ariaPrevLabel, [prevClass,navClass]))
      if (start > 0) links.unshift(renderLink(1, firstLabel, ariaFirstLabel, [firstClass, navClass]))
      if (current < total) links.push(renderLink(current + 1, nextLabel, ariaNextLabel, [nextClass, navClass]))
      if (end < total) links.push(renderLink(total, lastLabel, ariaLastLabel, [lastClass, navClass]))
    }

    if (links.length < 2) return null

    return h('nav', {
      ...data,
      attrs: {
        'role': 'navigation',
        'aria-label': ariaLabel
      }
    }, links)
  }
}

function createPagePath (path, page) {
  const suffix = /\/$/.test(path) ? '/' : ''
  return page > 1 ? unslashEnd(path) + `/${page}${suffix}` : path
}

function resolveRange ({
   currentPage: current = 1,
   totalPages: total = 1
  }, range) {
  const offset = Math.ceil(range / 2)

  let start = Math.floor(current - offset)
  let end = Math.floor(current + offset)

  if (total <= range) {
    start = 0
    end = total
  } else if (current <= offset) {
    start = 0
    end = range
  } else if ((current + offset) >= total) {
    start = total - range
    end = total
  }

  const pages = []

  for (let page = start + 1; page <= end; page++) {
    pages.push(page)
  }

  return { current, total, start, end, pages }
}
