import Link from './Link'

// @vue/component
export default {
  functional: true,

  props: {
    info: { type: Object, required: true },
    showLinks: { type: Boolean, default: true },
    showNavigation: { type: Boolean, default: true },
    firstLabel: { type: String, default: '«' },
    prevLabel: { type: String, default: '‹' },
    nextLabel: { type: String, default: '›' },
    lastLabel: { type: String, default: '»' },
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

  render: (h, { props, data }) => {
    const { info, showLinks, showNavigation, ariaLabel } = props
    const { current, total, pages, start, end } = resolveRange(info, props.range)

    const renderLink = (page, text = page, ariaLabel = text) => {
      if (page === current) ariaLabel = props.ariaCurrentLabel

      const linkProps = { page }
      
      if (props.activeLinkClass) {
        linkProps.activeClass = props.activeLinkClass
      }

      if (props.exactActiveLinkClass) {
        linkProps.exactActiveClass = props.exactActiveLinkClass
      }

      return h(Link, {
        class: props.linkClass,
        props: linkProps,
        attrs: {
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

      if (current > 1) links.unshift(renderLink(current - 1, prevLabel, ariaPrevLabel))
      if (start > 0) links.unshift(renderLink(1, firstLabel, ariaFirstLabel))
      if (current < total) links.push(renderLink(current + 1, nextLabel, ariaNextLabel))
      if (end < total) links.push(renderLink(total, lastLabel, ariaLastLabel))
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
