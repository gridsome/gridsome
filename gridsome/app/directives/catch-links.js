import router from '../router'
import config from '#gridsome/config'
import { NOT_FOUND_NAME } from '#gridsome/constants'
import { stripPathPrefix } from '../utils/helpers'

function onCatchLink(event) {
  const { hostname, port } = event.target.ownerDocument.location
  const $el = event.target.closest('a')

  if (
    event.defaultPrevented || // disables this behavior
    event.which !== 1 || // not a left click
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    $el === null || // no link clicked
    $el.__gLink__ || // g-link component
    $el.hostname !== hostname || // external link
    $el.port !== port || // external link
    /\.[^.]+$/.test($el.pathname) || // link to a file
    /\b_blank\b/i.test($el.target) // opens in new tab
  ) return

  if (
    config.pathPrefix &&
    !$el.pathname.startsWith(config.pathPrefix)
  ) {
    return // must include pathPrefix in path
  }

  const path = stripPathPrefix($el.pathname)
  const { route, location } = router.resolve({
    path: path + ($el.search || '') + decodeURI($el.hash || '')
  })

  if (route.name === NOT_FOUND_NAME) {
    return
  }

  router.push(location, () => {})
  event.preventDefault()
}

export default {
  inserted (el) {
    el.addEventListener('click', onCatchLink, false)
  },
  unbind (el) {
    console.log('unbind', el)
    el.removeEventListener('click', onCatchLink)
  }
}
